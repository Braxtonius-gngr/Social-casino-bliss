const TIER_WEIGHTS = { S: 1, A: 2, B: 3, C: 4, D: 5 };
const DEFAULT_TZ = 'America/Chicago';

// A site in the runner's catalog:
//   { id, name, url, scTier, resetHour?, resetTZ?, cooldownHours? }
// `name` is the platform's name exactly as in your dailyrollover.com deck;
// with Supabase on, the deck's reset rule wins over the local fields.
class CSPScheduler {
    constructor({ allowedDomains, stateStore, defaultTZ }) {
        this.allowedDomains = (allowedDomains || []).map(d => String(d).toLowerCase().replace(/^www\./, ''));
        this.stateStore = stateStore;
        this.defaultTZ = isValidTimeZone(defaultTZ) ? defaultTZ : DEFAULT_TZ;
        // Strict serial execution (1 at a time).
        this.concurrency = 1;
    }

    async start() {
        if (this.stateStore && this.stateStore.synced) {
            const ok = await this.stateStore.pullDeck();
            console.log(ok
                ? `[CSPScheduler] Read your deck: ${this.stateStore.remote.deck.size} platform(s) with their reset rules and newest collections.`
                : '[CSPScheduler] Could not read your deck; using local timers only this sweep.');
        }
        return true;
    }

    // --- Allowlist ------------------------------------------------------------

    isAllowed(site) {
        let host;
        try {
            host = new URL(site.url).hostname.toLowerCase().replace(/^www\./, '');
        } catch (_) {
            return false;
        }
        return this.allowedDomains.some(d => host === d || host.endsWith(`.${d}`));
    }

    // --- Checkpoint backoff ---------------------------------------------------

    // Every checkpoint is counted. A checkpoint cleared in its window costs
    // nothing more; only one left uncleared starts a backoff
    // (recordUnclearedCheckpoint), as the README says.
    recordFrictionEvent(siteId, severity = 'Tier2') {
        const existing = (this.stateStore && this.stateStore.getFriction(siteId)) || {
            challengeCount: 0,
            cooldownMultiplier: 1,
            tier: severity
        };

        existing.challengeCount += 1;
        existing.lastSeen = Date.now();
        existing.tier = severity;

        if (this.stateStore) this.stateStore.saveFriction(siteId, existing);
        console.warn(`[CSPScheduler] Checkpoint logged for [${siteId}]. Severity: ${severity} (checkpoint #${existing.challengeCount})`);
    }

    // The checkpoint's window closed with nobody clearing it: back off 4h (24h
    // for 2FA), doubling per uncleared repeat up to 16x, until a clean visit.
    recordUnclearedCheckpoint(siteId, severity = 'Tier2') {
        const existing = (this.stateStore && this.stateStore.getFriction(siteId)) || {
            challengeCount: 1,
            cooldownMultiplier: 1,
            tier: severity
        };

        existing.cooldownMultiplier = existing.uncleared
            ? Math.min((existing.cooldownMultiplier || 1) * 2, 16)
            : (existing.cooldownMultiplier || 1);
        existing.uncleared = (existing.uncleared || 0) + 1;
        existing.lastChallenged = Date.now();
        existing.tier = severity;

        if (this.stateStore) this.stateStore.saveFriction(siteId, existing);
        console.warn(`[CSPScheduler] Checkpoint on [${siteId}] went uncleared. Backing off ${existing.cooldownMultiplier}x.`);
    }

    // A visit with no checkpoint ends the backoff.
    recordCleanVisit(siteId) {
        if (this.stateStore) this.stateStore.clearFriction(siteId);
    }

    isUnderQuarantine(siteId) {
        const record = this.stateStore ? this.stateStore.getFriction(siteId) : null;
        if (!record || !record.lastChallenged) return false;

        const baseCoolDownMs = record.tier === 'Tier3' ? 24 * 3600 * 1000 : 4 * 3600 * 1000;
        const coolDownWindowMs = baseCoolDownMs * record.cooldownMultiplier;
        const timeElapsed = Date.now() - record.lastChallenged;

        if (timeElapsed < coolDownWindowMs) {
            const minsLeft = Math.ceil((coolDownWindowMs - timeElapsed) / 60000);
            console.log(`[CSPScheduler] [${siteId}] backing off after a checkpoint (${record.tier}, ~${minsLeft}m left). Skipping.`);
            return true;
        }
        return false;
    }

    // --- Readiness (the site's rules) -----------------------------------------

    // The reset rule for a site: the deck's when it has the platform, else the
    // site's local fields.
    ruleFor(site) {
        const game = this.stateStore ? this.stateStore.getDeckGame(site.name) : null;
        const src = game || site;
        return {
            resetHour: src.resetHour,
            resetTZ: src.resetTZ,
            cooldownHours: src.cooldownHours,
            fromDeck: Boolean(game)
        };
    }

    // Port of getCooldownState() in index.html, so the runner and your cards
    // agree on when a platform is ready.
    getCooldownState(site, now = Date.now()) {
        const rule = this.ruleFor(site);
        const lastCollected = this.stateStore ? this.stateStore.getLastCollected(site) : 0;

        if (Number.isInteger(rule.resetHour) && rule.resetHour >= 0 && rule.resetHour <= 23) {
            const tz = isValidTimeZone(rule.resetTZ) ? rule.resetTZ : this.defaultTZ;
            const lastReset = lastResetInstant(now, rule.resetHour, tz);
            if (lastCollected >= lastReset) {
                const nextReadyAt = nextResetInstant(now, rule.resetHour, tz);
                return { isReady: false, remainingMs: nextReadyAt - now, nextReadyAt, mode: 'fixed' };
            }
            return { isReady: true, remainingMs: 0, nextReadyAt: now, mode: 'fixed' };
        }

        const hours = typeof rule.cooldownHours === 'number' && Number.isFinite(rule.cooldownHours) && rule.cooldownHours > 0 ? rule.cooldownHours : 24;
        const remaining = Math.max(0, hours * 3600 * 1000 - (now - lastCollected));
        return { isReady: remaining === 0, remainingMs: remaining, nextReadyAt: remaining === 0 ? now : now + remaining, mode: 'rolling' };
    }

    // Why a site would be skipped right now, or null if it's due.
    skipReason(site, now = Date.now()) {
        if (!this.isAllowed(site)) return `not on the allowlist (${site.url})`;
        if (this.isUnderQuarantine(site.id)) return 'backing off after a checkpoint';
        const state = this.getCooldownState(site, now);
        if (!state.isReady) return `not ready (resets in ~${Math.ceil(state.remainingMs / 60000)}m)`;
        const local = this.stateStore ? this.stateStore.getTimer(site.id) : null;
        if (local && local.notBefore && now < local.notBefore) {
            return `waiting out its start offset (~${Math.ceil((local.notBefore - now) / 60000)}m)`;
        }
        return null;
    }

    isReadyToClaim(site) {
        return this.skipReason(site) === null;
    }

    // Due sites, highest SC tier first.
    buildPriorityQueue(siteCatalog) {
        return siteCatalog
            .filter(site => {
                const reason = this.skipReason(site);
                if (reason) console.log(`[CSPScheduler] [${site.id}] skipped: ${reason}.`);
                return !reason;
            })
            .sort((a, b) => {
                const weightA = TIER_WEIGHTS[(a.scTier || 'B').toUpperCase()] || 99;
                const weightB = TIER_WEIGHTS[(b.scTier || 'B').toUpperCase()] || 99;
                return weightA - weightB;
            });
    }

    // After a claim: when the site is next ready by its rule, and a local
    // start offset so the next visit isn't at the exact reset minute.
    // Computed from the claim itself, not from stored timers (which don't have
    // this claim yet).
    nextAfterClaim(site, claimedAt) {
        const rule = this.ruleFor(site);
        let nextClaimAt;
        let fixed = false;
        if (Number.isInteger(rule.resetHour) && rule.resetHour >= 0 && rule.resetHour <= 23) {
            const tz = isValidTimeZone(rule.resetTZ) ? rule.resetTZ : this.defaultTZ;
            nextClaimAt = nextResetInstant(claimedAt, rule.resetHour, tz);
            fixed = true;
        } else {
            const hours = typeof rule.cooldownHours === 'number' && Number.isFinite(rule.cooldownHours) && rule.cooldownHours > 0 ? rule.cooldownHours : 24;
            nextClaimAt = claimedAt + hours * 3600 * 1000;
        }
        const offsetMinutes = fixed ? this.getRandomJitter(6, 48) : this.getRandomJitter(3, 18);
        return { nextClaimAt, notBefore: nextClaimAt + offsetMinutes * 60 * 1000 };
    }

    getRandomJitter(minMinutes, maxMinutes) {
        return Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;
    }
}

// --- Time zone helpers (same results as lastResetInstant/nextResetInstant in
// index.html, for an explicit IANA zone) ---------------------------------------

function isValidTimeZone(tz) {
    if (!tz || typeof tz !== 'string') return false;
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz });
        return true;
    } catch (_) {
        return false;
    }
}

function partsIn(ms, tz) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).formatToParts(new Date(ms));
    const get = (type) => parseInt(parts.find(p => p.type === type).value, 10);
    return { y: get('year'), mo: get('month'), d: get('day'), h: get('hour') % 24, mi: get('minute'), s: get('second') };
}

// The UTC instant when the wall clock in `tz` reads y-mo-d hour:00.
function zonedHourToUtc(y, mo, d, hour, tz) {
    const target = Date.UTC(y, mo - 1, d, hour, 0, 0);
    let guess = target;
    for (let i = 0; i < 3; i++) {
        const p = partsIn(guess, tz);
        const wall = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
        const diff = target - wall;
        if (diff === 0) break;
        guess += diff;
    }
    return guess;
}

function lastResetInstant(now, hour, tz) {
    const t = partsIn(now, tz);
    let inst = zonedHourToUtc(t.y, t.mo, t.d, hour, tz);
    if (inst > now) {
        const prev = new Date(inst);
        prev.setUTCDate(prev.getUTCDate() - 1);
        const t2 = partsIn(prev.getTime(), tz);
        inst = zonedHourToUtc(t2.y, t2.mo, t2.d, hour, tz);
    }
    return inst;
}

function nextResetInstant(now, hour, tz) {
    const last = lastResetInstant(now, hour, tz);
    const nxt = new Date(last);
    nxt.setUTCDate(nxt.getUTCDate() + 1);
    const t = partsIn(nxt.getTime(), tz);
    return zonedHourToUtc(t.y, t.mo, t.d, hour, tz);
}

module.exports = CSPScheduler;
module.exports.lastResetInstant = lastResetInstant;
module.exports.nextResetInstant = nextResetInstant;

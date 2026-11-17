const TIER_WEIGHTS = { S: 1, A: 2, B: 3, C: 4, D: 5 };

class CSPScheduler {
    constructor({ activeCSPs, stateStore, rateLimit, concurrency }) {
        this.activeCSPs = activeCSPs || [];
        this.stateStore = stateStore;
        this.rateLimit = rateLimit || 60;
        // Strict serial execution (1 at a time) prevents simultaneous proxy/CPU bursts
        this.concurrency = 1;
        this.defaultResetHourCT = 5; // 5:00 AM America/Chicago baseline
    }

    async start() {
        if (this.stateStore) {
            await this.stateStore.pullRemoteTimers();
        }
        console.log(`[CSPScheduler] Synced with 5:00 AM CT baseline, SC Tier priority queue, & persistent quarantine.`);
        return true;
    }

    async recordFrictionEvent(casinoId, severity = 'Tier2') {
        const existing = (this.stateStore && this.stateStore.getFriction(casinoId)) || {
            challengeCount: 0,
            cooldownMultiplier: 1,
            tier: severity
        };

        existing.challengeCount += 1;
        existing.lastChallenged = Date.now();
        existing.cooldownMultiplier = Math.min(existing.cooldownMultiplier * 2, 16);
        existing.tier = severity;

        if (this.stateStore) {
            await this.stateStore.saveFriction(casinoId, existing);
        }
        console.warn(`[CSPScheduler] Persistent friction logged for [${casinoId}]. Severity: ${severity}, Backoff: ${existing.cooldownMultiplier}x`);
    }

    isUnderQuarantine(casinoId) {
        const record = this.stateStore ? this.stateStore.getFriction(casinoId) : null;
        if (!record) return false;

        const baseCoolDownMs = record.tier === 'Tier3' ? 24 * 3600 * 1000 : 4 * 3600 * 1000;
        const coolDownWindowMs = baseCoolDownMs * record.cooldownMultiplier;
        const timeElapsed = Date.now() - record.lastChallenged;

        if (timeElapsed < coolDownWindowMs) {
            const minsLeft = Math.ceil((coolDownWindowMs - timeElapsed) / 60000);
            console.log(`[CSPScheduler] [${casinoId}] quarantined (${record.tier}, ~${minsLeft}m remaining). Skipping.`);
            return true;
        }
        return false;
    }

    /**
     * Prevents colliding with manual "Deal Your Hand" claims synced in StateStore/Supabase.
     */
    isReadyToClaim(casinoConfig) {
        if (this.isUnderQuarantine(casinoConfig.id)) return false;

        const stored = this.stateStore ? this.stateStore.getTimer(casinoConfig.id) : null;
        if (stored && stored.nextClaimAt && Date.now() < stored.nextClaimAt) {
            const minsLeft = Math.ceil((stored.nextClaimAt - Date.now()) / 60000);
            console.log(`[CSPScheduler] [${casinoConfig.id}] already claimed (resets in ~${minsLeft}m). Skipping.`);
            return false;
        }
        return true;
    }

    /**
     * Builds an SC-Tier prioritized serial execution queue of sites currently eligible for collection.
     */
    buildPriorityQueue(siteCatalog) {
        return siteCatalog
            .filter(site => this.isReadyToClaim(site))
            .sort((a, b) => {
                const weightA = TIER_WEIGHTS[(a.scTier || 'B').toUpperCase()] || 99;
                const weightB = TIER_WEIGHTS[(b.scTier || 'B').toUpperCase()] || 99;
                return weightA - weightB;
            });
    }

    /**
     * Computes exact 5:00 AM America/Chicago reset timestamp (handling CST/CDT automatically)
     * plus stochastic human jitter, or rolling interval + backoff multiplier.
     */
    calculateNextExecution(casinoConfig) {
        const now = Date.now();
        const frictionRecord = this.stateStore ? this.stateStore.getFriction(casinoConfig.id) : null;
        const multiplier = frictionRecord ? frictionRecord.cooldownMultiplier : 1;

        if ((casinoConfig.resetType || 'fixed') === 'fixed') {
            const targetHourCT = casinoConfig.targetHourCT || this.defaultResetHourCT;
            // Stochastic morning offset: +6 to +48 minutes after 5:00 AM CT
            const jitterMinutes = this.getRandomJitter(6, 48);
            return this.getNextFixedResetTimestampCT(targetHourCT, jitterMinutes);
        } else {
            const intervalHours = casinoConfig.intervalHours || 24;
            const baseIntervalMs = intervalHours * 3600 * 1000;
            const adjustedInterval = baseIntervalMs * multiplier;
            // Small positive jitter (3 to 18 mins) so rolling timers never fire early
            const jitterMs = this.getRandomJitter(3, 18) * 60 * 1000;
            return now + adjustedInterval + jitterMs;
        }
    }

    getNextFixedResetTimestampCT(resetHourCT = 5, jitterMinutes = 0) {
        const now = new Date();
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Chicago',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).formatToParts(now);

        const getPart = (type) => parseInt(parts.find(p => p.type === type).value, 10);
        const ctYear = getPart('year');
        const ctMonth = getPart('month');
        const ctDay = getPart('day');
        const ctHour = getPart('hour') === 24 ? 0 : getPart('hour');

        const utcEquivalent = Date.UTC(ctYear, ctMonth - 1, ctDay, ctHour, getPart('minute'), getPart('second'));
        const offsetMs = now.getTime() - utcEquivalent;

        let targetUtc = Date.UTC(ctYear, ctMonth - 1, ctDay, resetHourCT, 0, 0) + offsetMs;
        if (now.getTime() >= targetUtc) {
            targetUtc += 24 * 60 * 60 * 1000;
        }

        return targetUtc + (jitterMinutes * 60 * 1000);
    }

    getRandomJitter(minMinutes, maxMinutes) {
        return Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;
    }

    async validateData(data) {
        if (!data || !data.casinoId || typeof data.rewardAvailable !== 'boolean') {
            console.warn('[CSPScheduler] Invalid data payload received:', data);
            return false;
        }
        return true;
    }
}

module.exports = CSPScheduler;

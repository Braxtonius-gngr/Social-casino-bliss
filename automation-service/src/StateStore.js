const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Where the runner keeps its state, and how it syncs with dailyrollover.com.
//
// Two places:
// - A local ledger (data/tandem-state.json): the runner's own claims, its
//   checkpoint backoff ("friction") and checkpoint flags. Always written.
// - Your Supabase project, when SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and
//   DRO_OWNER_USER_ID are set. It uses the SAME tables the site does:
//     * tracked_games_snapshot  read:  your deck - each platform's reset rule
//                                      (resetHour / resetTZ / cooldownHours)
//                                      and lastCollected
//     * collection_events       read:  your newest collection per platform,
//                                      so a claim you made by hand counts
//                               write: one row per real claim, exactly like
//                                      a tap in the app (device_id
//                                      'automation-runner'), so your cards'
//                                      timers, history and streaks follow
//     * automation_runner       write: status, recent logs, checkpoints;
//                               read:  "clear checkpoint" from the owner panel
//   The service-role key bypasses row security, so every query here is pinned
//   to DRO_OWNER_USER_ID. Keep that key in .env only.
// A time as epoch ms: the deck keeps lastCollected as a number, but an ISO
// string must not read as NaN (and so 0, which makes the platform look due).
function toMs(value) {
    if (value === null || value === undefined || value === '') return 0;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
    const t = Date.parse(String(value));
    return Number.isFinite(t) ? t : 0;
}

class StateStore {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../data');
        this.stateFile = path.join(this.dataDir, 'tandem-state.json');
        this.supabaseUrl = process.env.SUPABASE_URL || config.supabaseUrl || '';
        this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseKey || '';
        this.ownerUserId = process.env.DRO_OWNER_USER_ID || config.ownerUserId || '';
        this.deviceId = process.env.DRO_DEVICE_ID || config.deviceId || 'automation-runner';
        this.supabase = null;
        // Deck rules and newest collections by platform name, from the last pull.
        this.remote = { deck: new Map(), lastCollected: new Map(), pulledAt: 0 };

        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }

        this.state = this.loadLocalState();
        this.initSupabase();
    }

    initSupabase() {
        if (!this.supabaseUrl || !this.supabaseKey) {
            console.log('[StateStore] Local-ledger mode: set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DRO_OWNER_USER_ID in .env to sync with dailyrollover.com.');
            return;
        }
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.ownerUserId)) {
            console.warn('[StateStore] DRO_OWNER_USER_ID is missing or not a user id; staying in local-ledger mode so nothing is written to the wrong account.');
            return;
        }
        try {
            const { createClient } = require('@supabase/supabase-js');
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey, {
                auth: { persistSession: false, autoRefreshToken: false }
            });
            console.log('[StateStore] Connected to Supabase; syncing with your dailyrollover.com deck.');
        } catch (err) {
            console.warn('[StateStore] Supabase client unavailable, using the local ledger only:', err.message);
        }
    }

    get synced() {
        return Boolean(this.supabase);
    }

    loadLocalState() {
        const empty = { timers: {}, friction: {}, interventions: {} };
        try {
            if (fs.existsSync(this.stateFile)) {
                return { ...empty, ...JSON.parse(fs.readFileSync(this.stateFile, 'utf8')) };
            }
        } catch (err) {
            console.warn('[StateStore] Failed reading local state file, starting fresh:', err.message);
        }
        return empty;
    }

    saveLocalState() {
        fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
    }

    // --- Reading the deck -------------------------------------------------

    // Pulls your deck's reset rules and your newest collection per platform.
    // Returns false (and keeps the previous pull) if Supabase is off or fails,
    // so a network blip never makes a claimed site look ready.
    async pullDeck() {
        if (!this.supabase) return false;
        try {
            const { data: snapshot, error: deckError } = await this.supabase
                .from('tracked_games_snapshot')
                .select('games')
                .eq('user_id', this.ownerUserId)
                .maybeSingle();
            if (deckError) throw deckError;

            const deck = new Map();
            for (const game of (snapshot && Array.isArray(snapshot.games) ? snapshot.games : [])) {
                if (game && typeof game.name === 'string') deck.set(game.name, game);
            }

            const names = [...deck.keys()];
            const lastCollected = new Map();
            if (names.length) {
                const { data: rows, error: eventsError } = await this.supabase
                    .from('collection_events')
                    .select('platform_name, collected_at')
                    .eq('user_id', this.ownerUserId)
                    .eq('deleted', false)
                    .in('platform_name', names)
                    .order('collected_at', { ascending: false })
                    .limit(1000);
                if (eventsError) throw eventsError;
                for (const row of rows || []) {
                    if (!lastCollected.has(row.platform_name)) {
                        lastCollected.set(row.platform_name, new Date(row.collected_at).getTime());
                    }
                }
            }

            this.remote = { deck, lastCollected, pulledAt: Date.now() };
            return true;
        } catch (err) {
            console.warn('[StateStore] Deck pull failed; using the last known timers:', err.message);
            return false;
        }
    }

    // The deck entry for a platform name, or null.
    getDeckGame(platformName) {
        return (platformName && this.remote.deck.get(platformName)) || null;
    }

    // Newest known collection of a platform, from any source: the deck, the
    // collection log (manual claims on any device), and this runner's own.
    getLastCollected(site) {
        const game = this.getDeckGame(site.name);
        const local = this.state.timers[site.id];
        return Math.max(
            (game && toMs(game.lastCollected)) || 0,
            this.remote.lastCollected.get(site.name) || 0,
            (local && local.lastClaimedAt) || 0
        );
    }

    getTimer(siteId) {
        return this.state.timers[siteId] || null;
    }

    // --- Recording a claim ------------------------------------------------

    // Call only after the claim button was actually clicked.
    async recordClaim(site, { claimedAt, nextClaimAt, notBefore }) {
        this.state.timers[site.id] = {
            ...(this.state.timers[site.id] || {}),
            lastClaimedAt: claimedAt,
            nextClaimAt,
            notBefore,
            updatedBy: 'automation'
        };
        this.saveLocalState();

        if (!this.supabase) return;
        if (!site.name) {
            console.warn(`[StateStore] ${site.id} has no "name" matching a platform in your deck; claim kept locally only.`);
            return;
        }
        try {
            const { error } = await this.supabase.from('collection_events').insert({
                id: crypto.randomUUID(),
                user_id: this.ownerUserId,
                device_id: this.deviceId,
                platform_name: site.name,
                collected_at: new Date(claimedAt).toISOString(),
                deleted: false
            });
            if (error) throw error;
            this.remote.lastCollected.set(site.name, claimedAt);
        } catch (err) {
            console.warn(`[StateStore] Logging the ${site.name} collection to your deck failed (kept locally):`, err.message);
        }
    }

    // --- Checkpoint backoff (local only) -----------------------------------

    getFriction(siteId) {
        return this.state.friction[siteId] || null;
    }

    saveFriction(siteId, record) {
        this.state.friction[siteId] = record;
        this.saveLocalState();
    }

    clearFriction(siteId) {
        if (!this.state.friction[siteId]) return;
        delete this.state.friction[siteId];
        this.saveLocalState();
    }

    // --- Checkpoints (paused for a person) ----------------------------------

    async setIntervention(siteId, active, reason = '') {
        const at = Date.now();
        this.state.interventions[siteId] = { active, reason, updatedAt: at };
        this.saveLocalState();
        await this.upsertRunner(active
            ? { needs_intervention: true, intervention_site: siteId, intervention_reason: reason, intervention_at: new Date(at).toISOString() }
            : { needs_intervention: false, intervention_site: null, intervention_reason: null });
        return at;
    }

    // Cleared on this computer (the panel, or Enter) or from the owner panel
    // on the site after the checkpoint started.
    async isInterventionCleared(siteId, since) {
        const local = this.state.interventions[siteId];
        if (local && local.active === false && local.updatedAt >= since) return true;
        if (!this.supabase) return false;
        try {
            const { data, error } = await this.supabase
                .from('automation_runner')
                .select('clear_requested_at')
                .eq('user_id', this.ownerUserId)
                .maybeSingle();
            if (error) throw error;
            return Boolean(data && data.clear_requested_at && new Date(data.clear_requested_at).getTime() >= since);
        } catch (err) {
            console.warn('[StateStore] Checking for a remote clear failed:', err.message);
            return false;
        }
    }

    // Marks the checkpoint cleared locally (the HUD button, or Enter).
    clearInterventionLocally(siteId) {
        this.state.interventions[siteId] = { active: false, reason: '', updatedAt: Date.now() };
        this.saveLocalState();
    }

    // --- Runner status --------------------------------------------------------

    async upsertRunner(fields) {
        if (!this.supabase) return;
        try {
            const { error } = await this.supabase.from('automation_runner').upsert({
                user_id: this.ownerUserId,
                ...fields,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
            if (error) throw error;
        } catch (err) {
            console.warn('[StateStore] Runner status sync failed:', err.message);
        }
    }
}

module.exports = StateStore;

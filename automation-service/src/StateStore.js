const fs = require('fs');
const path = require('path');

class StateStore {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../data');
        this.stateFile = path.join(this.dataDir, 'tandem-state.json');
        this.supabaseUrl = process.env.SUPABASE_URL || config.supabaseUrl || '';
        this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseKey || '';
        this.supabase = null;

        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }

        this.state = this.loadLocalState();
        this.initSupabase();
    }

    initSupabase() {
        if (!this.supabaseUrl || !this.supabaseKey) {
            console.log('[StateStore] Running in local-ledger mode (add SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY in .env for cloud sync).');
            return;
        }
        try {
            const { createClient } = require('@supabase/supabase-js');
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
            console.log('[StateStore] Connected to Supabase for two-way dailyrollover.com sync.');
        } catch (err) {
            console.warn('[StateStore] Supabase client unavailable, falling back to local disk ledger:', err.message);
        }
    }

    loadLocalState() {
        try {
            if (fs.existsSync(this.stateFile)) {
                return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
            }
        } catch (err) {
            console.warn('[StateStore] Failed reading local state file, starting fresh:', err.message);
        }
        return { timers: {}, friction: {}, interventions: {} };
    }

    saveLocalState() {
        fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
    }

    async pullRemoteTimers() {
        if (!this.supabase) return this.state.timers;
        try {
            const { data, error } = await this.supabase
                .from('casino_timers')
                .select('casino_id, last_claimed_at, next_claim_at, sc_tier, reset_type, interval_hours');

            if (error) throw error;
            if (Array.isArray(data)) {
                for (const row of data) {
                    this.state.timers[row.casino_id] = {
                        lastClaimedAt: row.last_claimed_at ? new Date(row.last_claimed_at).getTime() : 0,
                        nextClaimAt: row.next_claim_at ? new Date(row.next_claim_at).getTime() : 0,
                        scTier: row.sc_tier || 'B',
                        resetType: row.reset_type || 'fixed',
                        intervalHours: row.interval_hours || 24
                    };
                }
                this.saveLocalState();
            }
        } catch (err) {
            console.warn('[StateStore] Remote timer pull skipped:', err.message);
        }
        return this.state.timers;
    }

    getTimer(casinoId) {
        return this.state.timers[casinoId] || null;
    }

    async recordClaim(casinoId, { claimedAt, nextClaimAt, rewardAvailable, source = 'automation' }) {
        this.state.timers[casinoId] = {
            ...(this.state.timers[casinoId] || {}),
            lastClaimedAt: claimedAt,
            nextClaimAt,
            rewardAvailable,
            updatedBy: source
        };
        this.saveLocalState();

        if (this.supabase) {
            try {
                await this.supabase.from('casino_timers').upsert({
                    casino_id: casinoId,
                    last_claimed_at: new Date(claimedAt).toISOString(),
                    next_claim_at: new Date(nextClaimAt).toISOString(),
                    needs_intervention: false,
                    updated_by: source
                }, { onConflict: 'casino_id' });
            } catch (err) {
                console.warn(`[StateStore] Supabase claim sync failed for ${casinoId}:`, err.message);
            }
        }
    }

    getFriction(casinoId) {
        return this.state.friction[casinoId] || null;
    }

    async saveFriction(casinoId, record) {
        this.state.friction[casinoId] = record;
        this.saveLocalState();

        if (this.supabase) {
            try {
                await this.supabase.from('site_friction').upsert({
                    casino_id: casinoId,
                    challenge_count: record.challengeCount,
                    cooldown_multiplier: record.cooldownMultiplier,
                    tier: record.tier,
                    last_challenged_at: new Date(record.lastChallenged).toISOString()
                }, { onConflict: 'casino_id' });
            } catch (_) {}
        }
    }

    async setInterventionFlag(casinoId, active, reason = '') {
        this.state.interventions[casinoId] = { active, reason, updatedAt: Date.now() };
        this.saveLocalState();

        if (this.supabase) {
            try {
                await this.supabase.from('casino_timers').upsert({
                    casino_id: casinoId,
                    needs_intervention: active,
                    intervention_reason: reason
                }, { onConflict: 'casino_id' });
            } catch (_) {}
        }
    }

    async isInterventionCleared(casinoId) {
        if (this.supabase) {
            try {
                const { data } = await this.supabase
                    .from('casino_timers')
                    .select('needs_intervention')
                    .eq('casino_id', casinoId)
                    .single();
                if (data && data.needs_intervention === false) {
                    this.state.interventions[casinoId] = { active: false, updatedAt: Date.now() };
                    this.saveLocalState();
                    return true;
                }
            } catch (_) {}
        }
        return this.state.interventions[casinoId]?.active === false;
    }
}

module.exports = StateStore;

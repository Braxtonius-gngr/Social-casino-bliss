class CSPScheduler {
    constructor({ activeCSPs, rateLimit, concurrency }) {
        this.activeCSPs = activeCSPs || [];
        this.rateLimit = rateLimit || 30;
        this.concurrency = concurrency || 5;
        this.casinoDataStore = new Map();
        this.frictionLog = new Map();
    }

    async start() {
        console.log(`[CSPScheduler] Initialized with Tiered Quarantine Matrix & Fixed Reset Anchors.`);
        return true;
    }

    recordFrictionEvent(casinoId, severity = 'Tier2') {
        const existing = this.frictionLog.get(casinoId) || { challengeCount: 0, cooldownMultiplier: 1, tier: severity };

        existing.challengeCount += 1;
        existing.lastChallenged = Date.now();
        existing.cooldownMultiplier = Math.min(existing.cooldownMultiplier * 2, 16);
        existing.tier = severity;

        this.frictionLog.set(casinoId, existing);
        console.warn(`[CSPScheduler] Friction logged for [${casinoId}]. Severity: ${severity}, Backoff multiplier: ${existing.cooldownMultiplier}x`);
    }

    isUnderQuarantine(casinoId) {
        const record = this.frictionLog.get(casinoId);
        if (!record) return false;

        const baseCoolDownMs = record.tier === 'Tier3' ? 24 * 3600 * 1000 : 4 * 3600 * 1000;
        const coolDownWindowMs = baseCoolDownMs * record.cooldownMultiplier;
        const timeElapsed = Date.now() - record.lastChallenged;

        if (timeElapsed < coolDownWindowMs) {
            console.log(`[CSPScheduler] [${casinoId}] is under ${record.tier} quarantine. Skipping run to preserve account safety.`);
            return true;
        }
        return false;
    }

    calculateNextExecution(casinoConfig) {
        const now = Date.now();
        const frictionRecord = this.frictionLog.get(casinoConfig.id);
        const multiplier = frictionRecord ? frictionRecord.cooldownMultiplier : 1;

        if (casinoConfig.resetType === 'fixed') {
            const targetHour = casinoConfig.targetHour || 8;
            const jitterMinutes = this.getRandomJitter(-15, 30);

            const nextRun = new Date();
            nextRun.setHours(targetHour, jitterMinutes, 0, 0);

            if (nextRun.getTime() <= now) {
                nextRun.setDate(nextRun.getDate() + 1);
            }
            return nextRun.getTime();
        } else {
            const baseIntervalMs = casinoConfig.intervalHours * 3600 * 1000;
            const adjustedInterval = baseIntervalMs * multiplier;
            const jitterMs = this.getRandomJitter(-10, 15) * 60 * 1000;
            return now + adjustedInterval + jitterMs;
        }
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

    getAllCasinoData() {
        return Array.from(this.casinoDataStore.entries()).map(([id, data]) => ({
            id,
            ...data,
            frictionStatus: this.frictionLog.get(id) || null
        }));
    }

    static async submitToDashboard(data) {
        console.log(`[CSPScheduler] Syncing update to dailyrollover.com dashboard for casino: ${data.casinoId}`);
        return true;
    }
}

module.exports = CSPScheduler;

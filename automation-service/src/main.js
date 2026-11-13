const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '../.env') }); } catch (_) {}

const StateStore = require('./StateStore');
const CSPScheduler = require('./SchedulerModule');
const CSPExecutor = require('./ExecutorModule');
const CSPSecurity = require('./SecurityConfig');
const CAPTCHASolver = require('./SeleniumGrid');

class DailyRolloverCollector {
    constructor(dailyUrl, config = {}) {
        this.dailyUrl = dailyUrl || 'https://dailyrollover.com';
        this.stateStore = new StateStore(config);
        this.scheduler = new CSPScheduler({
            activeCSPs: config.allowedCSPs || [],
            stateStore: this.stateStore,
            rateLimit: 60,
            concurrency: 1
        });

        this.security = new CSPSecurity(config);
        this.captchaSolver = new CAPTCHASolver(this.scheduler, this.stateStore, config);
        this.executor = new CSPExecutor(this.dailyUrl, this.security, this.captchaSolver);
        this.running = true;
    }

    async runAccountCheck(accountConfig, siteConfig) {
        const casinoId = siteConfig.id;
        if (!this.scheduler.isReadyToClaim(siteConfig)) {
            return { casinoId, status: 'skipped_not_ready' };
        }

        const result = await this.executor.visitTarget(accountConfig, siteConfig.url, casinoId);

        if (result.status === 'success') {
            const isValid = await this.scheduler.validateData(result);
            if (isValid) {
                const nextClaimAt = this.scheduler.calculateNextExecution(siteConfig);
                await this.stateStore.recordClaim(casinoId, {
                    claimedAt: Date.now(),
                    nextClaimAt,
                    rewardAvailable: result.rewardAvailable,
                    source: 'automation'
                });
                result.nextClaimAt = new Date(nextClaimAt).toISOString();
                console.log(`[Collector] Synced [${casinoId}] -> Next reset at ${result.nextClaimAt}`);
            }
        }

        return result;
    }

    /**
     * Runs an SC-Tier prioritized serial sweep across eligible sites with natural inter-site pauses.
     */
    async runTandemSweep(accountConfig, siteCatalog) {
        await this.scheduler.start();
        const queue = this.scheduler.buildPriorityQueue(siteCatalog);
        console.log(`[Collector] Priority queue built: ${queue.length} eligible site(s) ordered by SC Tier.`);

        const results = [];
        for (let i = 0; i < queue.length; i++) {
            if (!this.running) break;
            const site = queue[i];
            const res = await this.runAccountCheck(accountConfig, site);
            results.push(res);

            // Inter-site breathing room (45s to 180s in live mode; 300ms in dry-run)
            if (i < queue.length - 1) {
                const minWait = this.executor.liveBrowser ? 45000 : 250;
                const maxWait = this.executor.liveBrowser ? 180000 : 500;
                await this.security.humanDelay(minWait, maxWait);
            }
        }

        return results;
    }
}

module.exports = DailyRolloverCollector;

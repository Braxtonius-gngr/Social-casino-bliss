const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '../.env') }); } catch (_) {}

const StateStore = require('./StateStore');
const CSPScheduler = require('./SchedulerModule');
const CSPExecutor = require('./ExecutorModule');
const CSPSecurity = require('./SecurityConfig');
const CAPTCHASolver = require('./SeleniumGrid');
const TelemetryServer = require('./TelemetryServer');

class DailyRolloverCollector {
    constructor(dailyUrl, config = {}) {
        this.dailyUrl = dailyUrl || 'https://dailyrollover.com';
        this.stateStore = new StateStore(config);
        this.telemetry = new TelemetryServer({
            port: config.telemetryPort || 4789,
            // A dry run keeps its status to the local feed: the owner panel's
            // automation_runner row is written only by a live run.
            stateStore: process.env.LIVE_BROWSER === 'true' ? this.stateStore : null
        });

        this.scheduler = new CSPScheduler({
            // Domains the runner may visit; a catalog site on any other is skipped.
            allowedDomains: config.allowedDomains || config.allowedCSPs || [],
            stateStore: this.stateStore,
            defaultTZ: process.env.BOT_TZ || config.defaultTZ
        });

        this.security = new CSPSecurity(config);
        this.captchaSolver = new CAPTCHASolver(this.scheduler, this.stateStore, config);
        this.executor = new CSPExecutor(this.dailyUrl, this.security, this.captchaSolver);
        this.running = true;
    }

    async runAccountCheck(accountConfig, siteConfig) {
        const casinoId = siteConfig.id;
        const skip = this.scheduler.skipReason(siteConfig);
        if (skip) {
            await this.telemetry.emit({ logMessage: `Skipped ${casinoId}: ${skip}`, logLevel: 'muted' });
            return { casinoId, status: 'skipped', reason: skip };
        }

        await this.telemetry.emit({
            status: 'RUNNING',
            currentSite: casinoId,
            currentTier: siteConfig.scTier || 'B',
            step: `Opening session for ${casinoId}...`,
            nextActionAt: null,
            logMessage: `Checking ${casinoId} [Tier ${siteConfig.scTier || 'B'}]`,
            logLevel: 'info'
        });

        const result = await this.executor.visitTarget(accountConfig, siteConfig.url, casinoId);

        if (result.status === 'dry_run') {
            await this.telemetry.emit({
                step: `Dry run: visited ${casinoId} (nothing claimed or recorded)`,
                logMessage: `Dry run ${casinoId}: no browser, nothing recorded`,
                logLevel: 'muted'
            });
        } else if (result.status === 'success') {
            if (!result.challenged) this.scheduler.recordCleanVisit(casinoId);

            if (result.claimed) {
                const claimedAt = Date.now();
                const { nextClaimAt, notBefore } = this.scheduler.nextAfterClaim(siteConfig, claimedAt);
                await this.stateStore.recordClaim(siteConfig, { claimedAt, nextClaimAt, notBefore });
                result.nextClaimAt = new Date(nextClaimAt).toISOString();
                await this.telemetry.emit({
                    step: `Claimed ${casinoId} (${result.visitDurationMs}ms)`,
                    logMessage: `Claimed ${casinoId} -> ready again ${new Date(nextClaimAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`,
                    logLevel: 'success'
                });
            } else {
                // Not recorded: the site stays due, so the next sweep tries again.
                const why = !result.rewardAvailable
                    ? 'no claim button found (signed out, already claimed, or the page changed)'
                    : 'autoClick is off';
                await this.telemetry.emit({
                    step: `Nothing claimed on ${casinoId}: ${why}`,
                    logMessage: `Not claimed ${casinoId}: ${why}`,
                    logLevel: 'warn'
                });
            }
        } else if (result.status === 'quarantined') {
            await this.telemetry.emit({
                status: 'RUNNING',
                step: `Backing off ${casinoId} (${result.reason})`,
                logMessage: `Checkpoint on ${casinoId} not cleared in time; backing off`,
                logLevel: 'warn'
            });
        } else {
            await this.telemetry.emit({
                step: `Issue on ${casinoId}: ${result.reason || result.status}`,
                logMessage: `Aborted ${casinoId}: ${result.reason || result.status}`,
                logLevel: 'error'
            });
        }

        return result;
    }

    async runTandemSweep(accountConfig, siteCatalog) {
        await this.telemetry.start();
        await this.scheduler.start();

        if (!this.executor.liveBrowser) {
            console.log('[Collector] DRY RUN (LIVE_BROWSER is not "true"): no browser opens and nothing is claimed or recorded.');
        } else if (!this.security.hasRealProxy()) {
            console.warn('\n[Collector] *** NO PROXY: every visit goes out from THIS computer\'s own internet connection (your home IP). ***\n');
        }

        const queue = this.scheduler.buildPriorityQueue(siteCatalog);
        await this.telemetry.emit({
            status: queue.length > 0 ? 'RUNNING' : 'IDLE',
            completedCount: 0,
            totalCount: queue.length,
            step: queue.length > 0 ? `Queued ${queue.length} eligible site(s)` : 'All sites up to date',
            logMessage: `Sweep initialized: ${queue.length} eligible site(s) in SC Tier order`,
            logLevel: 'info'
        });

        const results = [];
        for (let i = 0; i < queue.length; i++) {
            if (!this.running) break;
            const site = queue[i];
            const res = await this.runAccountCheck(accountConfig, site);
            results.push(res);

            await this.telemetry.emit({ completedCount: i + 1 });

            if (i < queue.length - 1) {
                const minWait = this.executor.liveBrowser ? 45000 : 250;
                const maxWait = this.executor.liveBrowser ? 180000 : 500;
                const waitMs = Math.floor(Math.random() * (maxWait - minWait + 1)) + minWait;

                await this.telemetry.emit({
                    status: 'WAITING_JITTER',
                    currentSite: queue[i + 1].id,
                    step: `Stochastic pause (${Math.round(waitMs / 1000)}s) before ${queue[i + 1].id}`,
                    nextActionAt: Date.now() + waitMs,
                    logMessage: `Pausing ${Math.round(waitMs / 1000)}s before next site`,
                    logLevel: 'muted'
                });

                await new Promise(r => setTimeout(r, waitMs));
            }
        }

        await this.telemetry.emit({
            status: 'COMPLETED',
            currentSite: null,
            step: `Sweep complete (${results.length} processed)`,
            nextActionAt: null,
            logMessage: `Sweep finished (${results.length} site(s) processed)`,
            logLevel: 'success'
        });

        await this.telemetry.stop(3000);
        return results;
    }
}

module.exports = DailyRolloverCollector;

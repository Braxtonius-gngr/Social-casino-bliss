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
            stateStore: this.stateStore
        });

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
            await this.telemetry.emit({
                logMessage: `Skipped ${casinoId} (already claimed or quarantined)`,
                logLevel: 'muted'
            });
            return { casinoId, status: 'skipped_not_ready' };
        }

        await this.telemetry.emit({
            status: 'RUNNING',
            currentSite: casinoId,
            currentTier: siteConfig.scTier || 'B',
            step: `Opening stealth session for ${casinoId}...`,
            nextActionAt: null,
            logMessage: `Checking ${casinoId} [Tier ${siteConfig.scTier || 'B'}]`,
            logLevel: 'info'
        });

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
                await this.telemetry.emit({
                    step: `Synced ${casinoId} (${result.visitDurationMs}ms)`,
                    logMessage: `Synced ${casinoId} -> Next reset ${new Date(nextClaimAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                    logLevel: 'success'
                });
            }
        } else if (result.status === 'quarantined') {
            await this.telemetry.emit({
                status: 'HITL_PAUSED',
                step: `Quarantined ${casinoId} (${result.reason})`,
                logMessage: `Checkpoint timeout on ${casinoId} — quarantined safely`,
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

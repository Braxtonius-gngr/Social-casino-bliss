const CSPScheduler = require('./SchedulerModule');
const CSPExecutor = require('./ExecutorModule');
const CSPSecurity = require('./SecurityConfig');
const CAPTCHASolver = require('./SeleniumGrid');

class DailyRolloverCollector {
    constructor(dailyUrl, config) {
        this.scheduler = new CSPScheduler({
            activeCSPs: config.allowedCSPs || [],
            rateLimit: 30,
            concurrency: 5
        });

        this.security = new CSPSecurity(config);
        this.captchaSolver = new CAPTCHASolver(this.scheduler);
        this.executor = new CSPExecutor(dailyUrl, this.security, this.captchaSolver);

        this.running = true;
    }

    async runAccountCheck(accountConfig, targetUrl, casinoId) {
        if (this.scheduler.isUnderQuarantine(casinoId)) {
            return { casinoId, status: 'skipped_quarantine' };
        }

        const result = await this.executor.visitTarget(accountConfig, targetUrl, casinoId);

        if (result.status === 'success') {
            const isValid = await this.scheduler.validateData(result);
            if (isValid) {
                await CSPScheduler.submitToDashboard(result);
            }
        }

        return result;
    }
}

module.exports = DailyRolloverCollector;

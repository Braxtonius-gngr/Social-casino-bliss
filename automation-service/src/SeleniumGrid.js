class SeleniumGridCaptchaSolver {
    constructor(scheduler) {
        this.scheduler = scheduler;
    }

    async detectChallenge(pageInstance) {
        console.log('[CAPTCHASolver] Inspecting DOM for Cloudflare/DataDome friction markers...');

        const hasChallenge = await pageInstance.evaluate(() => {
            return !!document.querySelector('iframe[src*="challenges.cloudflare.com"]') ||
                   !!document.querySelector('#security-check-container') ||
                   document.body.innerText.includes('Verify you are human') ||
                   document.body.innerText.includes('Checking your browser');
        });

        return hasChallenge;
    }

    async requestHumanIntervention(casinoId) {
        console.warn(`\n[ALERT] Security checkpoint encountered on target: ${casinoId}`);
        console.log(`[HITL] Pausing session. Please complete the verification manually...`);

        this.scheduler.recordFrictionEvent(casinoId, 'Tier2');

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.log('[HITL] Intervention window timed out. Quarantining session.');
                resolve(false);
            }, 120000);

            process.stdin.once('data', () => {
                clearTimeout(timeout);
                console.log('[HITL] Manual clearance received. Resuming workflow.');
                resolve(true);
            });
        });
    }

    async startInteractiveCheck(pageInstance, casinoId) {
        const challengeDetected = await this.detectChallenge(pageInstance);
        if (challengeDetected) {
            return await this.requestHumanIntervention(casinoId);
        }
        console.log('[CAPTCHASolver] Clear session. No challenges detected.');
        return true;
    }
}

module.exports = SeleniumGridCaptchaSolver;

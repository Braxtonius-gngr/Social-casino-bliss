const https = require('https');

class SeleniumGridCaptchaSolver {
    constructor(scheduler, stateStore, config = {}) {
        this.scheduler = scheduler;
        this.stateStore = stateStore;
        this.discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL || config.discordWebhookUrl || '';
    }

    async detectChallenge(pageInstance) {
        console.log('[CAPTCHASolver] Inspecting DOM for Cloudflare/DataDome/2FA friction markers...');

        const challengeReason = await pageInstance.evaluate(() => {
            if (document.querySelector('iframe[src*="challenges.cloudflare.com"]')) return 'Cloudflare Turnstile';
            if (document.querySelector('#security-check-container')) return 'Security Checkpoint';
            const text = document.body ? document.body.innerText : '';
            if (text.includes('Verify you are human') || text.includes('Checking your browser')) return 'Browser Verification Gate';
            if (text.includes('Two-Factor') || text.includes('Enter verification code')) return '2FA / OTP Prompt';
            return null;
        });

        return challengeReason;
    }

    async sendDiscordAlert(casinoId, reason) {
        if (!this.discordWebhookUrl) {
            console.log(`[HITL] (Set DISCORD_WEBHOOK_URL in .env for mobile alerts) Checkpoint on [${casinoId}]: ${reason}`);
            return;
        }

        const payload = JSON.stringify({
            username: 'Daily Roll Over • HITL Guard',
            embeds: [{
                title: `Manual Check Needed: ${casinoId}`,
                description: `Automation paused on **${casinoId}** due to **${reason}**.\n\nOpen **dailyrollover.com** or your browser session to complete verification, or ignore to auto-quarantine safely.`,
                color: 16753920,
                timestamp: new Date().toISOString()
            }]
        });

        return new Promise((resolve) => {
            try {
                const parsed = new URL(this.discordWebhookUrl);
                const req = https.request({
                    hostname: parsed.hostname,
                    path: parsed.pathname + parsed.search,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payload)
                    }
                }, (res) => {
                    res.on('data', () => {});
                    res.on('end', resolve);
                });
                req.on('error', (err) => {
                    console.warn('[HITL] Discord webhook failed:', err.message);
                    resolve();
                });
                req.write(payload);
                req.end();
            } catch (_) {
                resolve();
            }
        });
    }

    async requestHumanIntervention(casinoId, reason) {
        const severity = reason.includes('2FA') ? 'Tier3' : 'Tier2';
        console.warn(`\n[ALERT] ${reason} encountered on [${casinoId}] (${severity})`);

        await this.scheduler.recordFrictionEvent(casinoId, severity);
        if (this.stateStore) {
            await this.stateStore.setInterventionFlag(casinoId, true, reason);
        }
        await this.sendDiscordAlert(casinoId, reason);

        // Poll for clearance (either via Supabase dashboard toggle or Enter key in terminal) for up to 3 minutes
        const maxWaitMs = 180000;
        const pollIntervalMs = 5000;
        const start = Date.now();

        return new Promise((resolve) => {
            let resolved = false;
            const finish = async (cleared) => {
                if (resolved) return;
                resolved = true;
                clearInterval(poller);
                if (this.stateStore && cleared) {
                    await this.stateStore.setInterventionFlag(casinoId, false, '');
                }
                resolve(cleared);
            };

            process.stdin.once('data', () => {
                console.log(`[HITL] Terminal clearance received for [${casinoId}].`);
                finish(true);
            });

            const poller = setInterval(async () => {
                if (this.stateStore && await this.stateStore.isInterventionCleared(casinoId)) {
                    console.log(`[HITL] Remote clearance received from dailyrollover.com for [${casinoId}].`);
                    await finish(true);
                } else if (Date.now() - start >= maxWaitMs) {
                    console.log(`[HITL] Intervention window timed out for [${casinoId}]. Leaving in quarantine.`);
                    await finish(false);
                }
            }, pollIntervalMs);
        });
    }

    async startInteractiveCheck(pageInstance, casinoId) {
        const reason = await this.detectChallenge(pageInstance);
        if (reason) {
            return await this.requestHumanIntervention(casinoId, reason);
        }
        console.log(`[CAPTCHASolver] Clean session on [${casinoId}]. No friction detected.`);
        return true;
    }
}

module.exports = SeleniumGridCaptchaSolver;

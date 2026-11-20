const https = require('https');

class SeleniumGridCaptchaSolver {
    constructor(scheduler, stateStore, config = {}) {
        this.scheduler = scheduler;
        this.stateStore = stateStore;
        this.discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL || config.discordWebhookUrl || '';
        // Under pm2, systemd or Docker there is no terminal, so Enter never arrives.
        this.hasTTY = Boolean(process.stdin.isTTY);
        if (!this.hasTTY && process.env.LIVE_BROWSER === 'true') {
            console.warn('[security] No TTY: Enter-key clearance is unavailable. Clear checkpoints from the live panel or CLEAR CHECKPOINT on the site.');
        }
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
                    res.resume();
                    res.on('end', () => {
                        // A 429 or 5xx is an alert that never arrived; say so, but
                        // never let an alert failure stop the runner.
                        const ok = res.statusCode >= 200 && res.statusCode < 300;
                        if (!ok) console.warn(`[HITL] Discord webhook answered ${res.statusCode}; alert not delivered.`);
                        resolve({ ok, status: res.statusCode });
                    });
                });
                req.on('error', (err) => {
                    console.warn('[HITL] Discord webhook failed:', err.message);
                    resolve({ ok: false });
                });
                req.write(payload);
                req.end();
            } catch (_) {
                resolve({ ok: false });
            }
        });
    }

    async requestHumanIntervention(casinoId, reason) {
        const severity = reason.includes('2FA') ? 'Tier3' : 'Tier2';
        console.warn(`\n[ALERT] ${reason} encountered on [${casinoId}] (${severity})`);

        this.scheduler.recordFrictionEvent(casinoId, severity);
        // Anything cleared from now on counts for this checkpoint.
        const since = this.stateStore ? await this.stateStore.setIntervention(casinoId, true, reason) : Date.now();
        await this.sendDiscordAlert(casinoId, reason);

        // Wait up to 3 minutes for a clear: Enter in this terminal, the panel on
        // this computer, or CLEAR CHECKPOINT in the owner panel on the site.
        const maxWaitMs = 180000;
        const pollIntervalMs = 5000;
        const start = Date.now();

        return new Promise((resolve) => {
            let resolved = false;
            const onEnter = () => {
                console.log(`[HITL] Terminal clearance received for [${casinoId}].`);
                finish(true);
            };
            const finish = async (cleared) => {
                if (resolved) return;
                resolved = true;
                clearInterval(poller);
                // Drop the Enter-key listener so it doesn't pile up per checkpoint
                // or keep the process alive after the sweep ends.
                if (this.hasTTY) {
                    process.stdin.removeListener('data', onEnter);
                    process.stdin.pause();
                }
                // Cleared in the window: no backoff. Uncleared: the site backs off.
                if (!cleared) this.scheduler.recordUnclearedCheckpoint(casinoId, severity);
                if (this.stateStore) {
                    // Either way the runner moves on, so the site stops showing it as waiting.
                    await this.stateStore.setIntervention(casinoId, false);
                }
                resolve(cleared);
            };

            if (this.hasTTY) process.stdin.once('data', onEnter);

            const poller = setInterval(async () => {
                if (this.stateStore && await this.stateStore.isInterventionCleared(casinoId, since)) {
                    console.log(`[HITL] Clearance received for [${casinoId}].`);
                    await finish(true);
                } else if (Date.now() - start >= maxWaitMs) {
                    console.log(`[HITL] Intervention window timed out for [${casinoId}]. Leaving in quarantine.`);
                    await finish(false);
                }
            }, pollIntervalMs);
        });
    }

    // { proceed, challenged }: whether to carry on with the visit, and whether
    // a checkpoint came up at all (a clean visit ends the site's backoff).
    async startInteractiveCheck(pageInstance, casinoId) {
        const reason = await this.detectChallenge(pageInstance);
        if (reason) {
            const proceed = await this.requestHumanIntervention(casinoId, reason);
            return { proceed, challenged: true };
        }
        console.log(`[CAPTCHASolver] Clean session on [${casinoId}]. No checkpoint.`);
        return { proceed: true, challenged: false };
    }
}

module.exports = SeleniumGridCaptchaSolver;

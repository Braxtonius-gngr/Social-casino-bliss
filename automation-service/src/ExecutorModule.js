class CSPExecutor {
    constructor(baseUrl, securityManager, captchaSolver) {
        this.baseUrl = baseUrl;
        this.security = securityManager;
        this.captchaSolver = captchaSolver;
        this.liveBrowser = process.env.LIVE_BROWSER === 'true';
        this.useSystemChrome = process.env.USE_SYSTEM_CHROME !== 'false';

        this.claimSelectorFallbacks = [
            '[data-testid="claim-reward"]',
            '.daily-claim-button',
            'button:has-text("Claim Daily")',
            'button:has-text("Claim Bonus")',
            'button:has-text("Collect")',
            '//button[contains(translate(., "CLAIM", "claim"), "claim")]'
        ];
    }

    async visitTarget(accountConfig, targetUrl, casinoId) {
        const startTime = Date.now();
        console.log(`[CSPExecutor] Preparing ${this.liveBrowser ? 'LIVE' : 'DRY-RUN'} stealth visit for [${casinoId}] -> ${targetUrl}`);

        let session;
        try {
            session = await this.security.createSession(accountConfig.id, casinoId);
        } catch (err) {
            console.error(err.message);
            return { accountId: accountConfig.id, casinoId, status: 'aborted', reason: 'PROXY_TUNNEL_FAILURE' };
        }

        if (!this.liveBrowser) {
            await this.security.humanDelay(400, 900);
            return {
                accountId: accountConfig.id,
                casinoId,
                targetUrl,
                status: 'success',
                rewardAvailable: true,
                visitDurationMs: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };
        }

        const { chromium } = require('playwright');
        const launchOptions = {
            headless: false, // Headful with warm persistent profile minimizes Cloudflare Turnstile friction
            proxy: (!session.proxy || session.proxy.includes('provider.net')) ? undefined : { server: session.proxy },
            userAgent: session.userAgent,
            viewport: session.viewport,
            locale: 'en-US',
            timezoneId: 'America/Chicago',
            args: [
                '--disable-blink-features=AutomationControlled',
                '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
                '--no-sandbox'
            ]
        };

        if (this.useSystemChrome) {
            launchOptions.channel = 'chrome';
        }

        let browserContext;
        try {
            browserContext = await chromium.launchPersistentContext(session.profileDir, launchOptions);
            await browserContext.addInitScript(session.initScript);

            const page = await browserContext.newPage();
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await this.security.humanDelay(1800, 3500);

            const clearToProceed = await this.captchaSolver.startInteractiveCheck(page, casinoId);
            if (!clearToProceed) {
                await browserContext.close();
                return { accountId: accountConfig.id, casinoId, status: 'quarantined', reason: 'HITL_TIMEOUT' };
            }

            const claimLocator = await this.findResilientElement(page, this.claimSelectorFallbacks);
            const rewardAvailable = claimLocator !== null;

            if (rewardAvailable && accountConfig.autoClick) {
                await this.security.humanDelay(600, 1400);
                await claimLocator.click();
                await this.security.humanDelay(1200, 2200);
            }

            await browserContext.close();

            return {
                accountId: accountConfig.id,
                casinoId,
                targetUrl,
                status: 'success',
                rewardAvailable,
                visitDurationMs: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };
        } catch (err) {
            if (browserContext) await browserContext.close().catch(() => {});
            console.error(`[CSPExecutor] Error visiting [${casinoId}]:`, err.message);
            return { accountId: accountConfig.id, casinoId, status: 'error', reason: err.message };
        }
    }

    async findResilientElement(page, selectors) {
        for (const selector of selectors) {
            try {
                const locator = page.locator(selector).first();
                if (await locator.isVisible({ timeout: 900 })) {
                    return locator;
                }
            } catch (_) {}
        }
        return null;
    }
}

module.exports = CSPExecutor;

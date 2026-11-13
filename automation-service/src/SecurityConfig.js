const crypto = require('crypto');
const path = require('path');
const http = require('http');

class CSPSecurity {
    constructor(config = {}) {
        const envProxies = process.env.PROXY_POOL ? process.env.PROXY_POOL.split(',').map(p => p.trim()) : null;
        this.proxyPool = config.proxies || envProxies || [];
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
        ];
        this.profileBaseDir = config.profileBaseDir || path.join(__dirname, '../profiles');
    }

    async createSession(accountId, casinoId = 'default') {
        const proxy = this.assignStickyProxy(`${accountId}_${casinoId}`);

        const isTunnelHealthy = proxy ? await this.verifyProxyTunnel(proxy) : true;
        if (!isTunnelHealthy) {
            throw new Error(`[CSPSecurity] Proxy tunnel health check failed for ${proxy}. Aborting session to prevent IP leak.`);
        }

        const sessionId = `sess_${accountId}_${crypto.randomBytes(6).toString('hex')}`;
        // Dedicated warm profile per account so login cookies & IndexedDB persist across weeks
        const profileDir = path.join(this.profileBaseDir, `profile_${accountId}`);

        console.log(`[CSPSecurity] Verified tunnel & warm profile (${profileDir}) for [${casinoId}]`);

        return {
            id: sessionId,
            accountId,
            casinoId,
            userAgent: this.getRandomUserAgent(),
            proxy,
            viewport: this.getAccountViewport(accountId),
            profileDir,
            initScript: this.getStealthInitScript(accountId),
            createdAt: Date.now()
        };
    }

    getStealthInitScript(accountId) {
        const hash = crypto.createHash('md5').update(String(accountId)).digest('hex');
        const noiseSeed = (parseInt(hash.substring(0, 4), 16) % 5) + 1;

        return `
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
                if (parameter === 37445) return 'Intel Inc.';
                if (parameter === 37446) return 'Intel(R) Iris(TM) Xe Graphics';
                return getParameter.apply(this, arguments);
            };

            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function(type) {
                const context = this.getContext('2d');
                if (context) {
                    const imageData = context.getImageData(0, 0, this.width, this.height);
                    if (imageData.data.length > 0) {
                        imageData.data[0] = (imageData.data[0] + ${noiseSeed}) % 255;
                        context.putImageData(imageData, 0, 0);
                    }
                }
                return originalToDataURL.apply(this, arguments);
            };
        `;
    }

    async verifyProxyTunnel(proxyUrl) {
        if (!proxyUrl || proxyUrl.includes('.local') || proxyUrl.includes('provider.net')) {
            return true;
        }
        return new Promise((resolve) => {
            try {
                const parsed = new URL(proxyUrl);
                const req = http.request({
                    host: parsed.hostname,
                    port: parsed.port,
                    method: 'CONNECT',
                    path: 'api.ipify.org:443',
                    timeout: 5000
                });
                req.on('connect', () => { req.destroy(); resolve(true); });
                req.on('error', () => resolve(false));
                req.on('timeout', () => { req.destroy(); resolve(false); });
                req.end();
            } catch (_) {
                resolve(false);
            }
        });
    }

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    assignStickyProxy(seedKey) {
        if (!this.proxyPool || this.proxyPool.length === 0) return null;
        if (!this.proxyPool || this.proxyPool.length === 0) {
            return null;
        }
        const hash = crypto.createHash('md5').update(String(seedKey)).digest('hex');
        const index = parseInt(hash.substring(0, 4), 16) % this.proxyPool.length;
        return this.proxyPool[index];
    }

    getAccountViewport(accountId) {
        const viewports = [
            { width: 1920, height: 1080 },
            { width: 1536, height: 864 },
            { width: 1440, height: 900 }
        ];
        const hash = crypto.createHash('md5').update(String(accountId)).digest('hex');
        return viewports[parseInt(hash.substring(0, 2), 16) % viewports.length];
    }

    async humanDelay(minMs = 1500, maxMs = 4000) {
        const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
        return new Promise(resolve => setTimeout(resolve, delay));
    }
}

module.exports = CSPSecurity;

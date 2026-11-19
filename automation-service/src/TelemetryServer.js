const http = require('http');

const MAX_LOGS = 25;

// Pages that may read the feed and clear a checkpoint. Any other site open in
// the same browser is refused, so it can't watch the runner or press its button.
// Add more with HUD_ALLOWED_ORIGINS (comma-separated) in .env.
const DEFAULT_ALLOWED_ORIGINS = [
    'https://dailyrollover.com',
    'https://www.dailyrollover.com'
];
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

class TelemetryServer {
    constructor(config = {}) {
        this.port = config.port || 4789;
        this.stateStore = config.stateStore || null;
        this.clients = new Set();
        this.server = null;
        const envOrigins = process.env.HUD_ALLOWED_ORIGINS
            ? process.env.HUD_ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
            : [];
        this.allowedOrigins = new Set([...DEFAULT_ALLOWED_ORIGINS, ...(config.allowedOrigins || []), ...envOrigins]);
        this.warnedNoSupabase = false;

        this.snapshot = {
            status: 'IDLE', // IDLE | RUNNING | WAITING_JITTER | HITL_PAUSED | COMPLETED | ERROR
            currentSite: null,
            currentTier: null,
            step: 'Standby',
            completedCount: 0,
            totalCount: 0,
            nextActionAt: null,
            updatedAt: Date.now(),
            logs: []
        };
    }

    start() {
        return new Promise((resolve) => {
            this.server = http.createServer((req, res) => {
                // Chrome Private Network Access & CORS, for the allowed pages only.
                // No Origin header means a same-machine tool (curl, a terminal): allowed.
                const origin = req.headers.origin;
                if (origin && !this.isAllowedOrigin(origin)) {
                    res.writeHead(403);
                    res.end();
                    return;
                }
                if (origin) {
                    res.setHeader('Access-Control-Allow-Origin', origin);
                    res.setHeader('Vary', 'Origin');
                    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                    res.setHeader('Access-Control-Allow-Private-Network', 'true');
                }

                if (req.method === 'OPTIONS') {
                    res.writeHead(204);
                    res.end();
                    return;
                }

                if (req.url === '/status' && req.method === 'GET') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(this.snapshot));
                    return;
                }

                if (req.url === '/events' && req.method === 'GET') {
                    res.writeHead(200, {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive'
                    });
                    res.write(`data: ${JSON.stringify(this.snapshot)}\n\n`);
                    this.clients.add(res);
                    req.on('close', () => this.clients.delete(res));
                    return;
                }

                if (req.url === '/clear-hitl' && req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk; });
                    req.on('end', async () => {
                        try {
                            const { casinoId } = JSON.parse(body || '{}');
                            if (casinoId && this.stateStore) {
                                await this.stateStore.setInterventionFlag(casinoId, false, '');
                            }
                            this.emit({
                                status: 'RUNNING',
                                step: `Manual clearance received for ${casinoId || 'checkpoint'}`,
                                logMessage: `Cleared HITL checkpoint via HUD (${casinoId || 'active'})`,
                                logLevel: 'success'
                            });
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: true }));
                        } catch (err) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: false, error: err.message }));
                        }
                    });
                    return;
                }

                res.writeHead(404);
                res.end();
            });

            this.server.on('error', (err) => {
                console.warn(`[Telemetry] Local HUD port ${this.port} busy (${err.code}); continuing without local SSE.`);
                resolve(false);
            });

            this.server.listen(this.port, '127.0.0.1', () => {
                console.log(`[Telemetry] Live feed broadcasting on http://127.0.0.1:${this.port}/events`);
                resolve(true);
            });
        });
    }

    async emit(patch = {}) {
        const { logMessage, logLevel = 'info', ...stateFields } = patch;
        Object.assign(this.snapshot, stateFields, { updatedAt: Date.now() });

        if (logMessage) {
            this.snapshot.logs.unshift({
                ts: new Date().toISOString(),
                level: logLevel,
                message: logMessage
            });
            if (this.snapshot.logs.length > MAX_LOGS) {
                this.snapshot.logs.length = MAX_LOGS;
            }
        }

        // Live feed for the HUD
        const payload = `data: ${JSON.stringify(this.snapshot)}\n\n`;
        for (const client of this.clients) {
            try { client.write(payload); } catch (_) {}
        }

        // Cloud copy for dailyrollover.com. supabase-js returns errors rather than
        // throwing, so check `error`; the try/catch covers network failures.
        if (this.stateStore && this.stateStore.supabase) {
            try {
                const { error } = await this.stateStore.supabase.from('automation_telemetry').upsert({
                    id: 'primary_runner',
                    status: this.snapshot.status,
                    current_site: this.snapshot.currentSite,
                    current_tier: this.snapshot.currentTier,
                    step: this.snapshot.step,
                    completed_count: this.snapshot.completedCount,
                    total_count: this.snapshot.totalCount,
                    next_action_at: this.snapshot.nextActionAt ? new Date(this.snapshot.nextActionAt).toISOString() : null,
                    recent_logs: this.snapshot.logs.slice(0, 10),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

                if (error) {
                    console.error('[Telemetry] Supabase upsert failed:', error.message);
                }
            } catch (err) {
                console.error('[Telemetry] Supabase upsert failed:', err.message);
            }
        } else if (!this.warnedNoSupabase) {
            // Local-ledger mode is valid; say so once, not on every update.
            this.warnedNoSupabase = true;
            console.warn('[Telemetry] Supabase client not initialized in StateStore — check automation-service/.env (feed stays local).');
        }
    }

    isAllowedOrigin(origin) {
        return this.allowedOrigins.has(origin) || LOCALHOST_ORIGIN.test(origin);
    }

    async stop(delayMs = 2500) {
        await new Promise(r => setTimeout(r, delayMs));
        for (const client of this.clients) {
            try { client.end(); } catch (_) {}
        }
        this.clients.clear();
        if (this.server) {
            this.server.close();
        }
    }
}

module.exports = TelemetryServer;

const http = require('http');

class TelemetryServer {
    constructor(config = {}) {
        this.port = config.port || 4789;
        this.stateStore = config.stateStore || null;
        this.clients = new Set();
        this.server = null;

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
                // Support Chrome Private Network Access & CORS for dailyrollover.com
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                res.setHeader('Access-Control-Allow-Private-Network', 'true');

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
            if (this.snapshot.logs.length > 25) {
                this.snapshot.logs.length = 25;
            }
        }

        const payload = `data: ${JSON.stringify(this.snapshot)}\n\n`;
        for (const client of this.clients) {
            try { client.write(payload); } catch (_) {}
        }

        if (this.stateStore && this.stateStore.supabase) {
            try {
                await this.stateStore.supabase.from('automation_telemetry').upsert({
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
            } catch (_) {}
        }
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

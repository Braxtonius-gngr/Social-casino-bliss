(() => {
    const LOCAL_SSE_URL = 'http://127.0.0.1:4789/events';
    const LOCAL_CLEAR_URL = 'http://127.0.0.1:4789/clear-hitl';

    const style = document.createElement('style');
    style.textContent = `
        #dro-runner-hud {
            position: fixed;
            bottom: 18px;
            right: 18px;
            z-index: 99999;
            font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
            color: #f3f4f6;
        }
        #dro-hud-pill {
            display: flex;
            align-items: center;
            gap: 9px;
            background: rgba(15, 23, 30, 0.94);
            border: 1px solid rgba(212, 175, 55, 0.45);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
            border-radius: 999px;
            padding: 8px 14px;
            cursor: pointer;
            font-size: 12.5px;
            font-weight: 600;
            letter-spacing: 0.02em;
            backdrop-filter: blur(8px);
            transition: transform 0.15s ease, border-color 0.2s ease;
        }
        #dro-hud-pill:hover { transform: translateY(-1px); border-color: #d4af37; }
        .dro-dot {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: #64748b;
            flex-shrink: 0;
        }
        .dro-dot.running {
            background: #10b981;
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
            animation: droPulse 1.6s infinite;
        }
        .dro-dot.jitter { background: #38bdf8; }
        .dro-dot.hitl {
            background: #f59e0b;
            animation: droPulse 1.1s infinite;
        }
        .dro-dot.done { background: #d4af37; }
        @keyframes droPulse {
            0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.65); }
            70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
            100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        #dro-hud-drawer {
            display: none;
            width: 330px;
            max-width: calc(100vw - 36px);
            margin-bottom: 10px;
            background: rgba(13, 19, 26, 0.97);
            border: 1px solid rgba(212, 175, 55, 0.4);
            border-radius: 14px;
            box-shadow: 0 14px 36px rgba(0, 0, 0, 0.6);
            overflow: hidden;
        }
        #dro-hud-drawer.open { display: block; }
        .dro-drawer-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 14px;
            background: rgba(212, 175, 55, 0.08);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            font-size: 12px;
            font-weight: 700;
            color: #facc15;
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }
        .dro-drawer-body { padding: 12px 14px; font-size: 12.5px; }
        .dro-progress-track {
            width: 100%;
            height: 6px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 999px;
            overflow: hidden;
            margin: 8px 0 10px;
        }
        .dro-progress-fill {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #10b981, #d4af37);
            transition: width 0.3s ease;
        }
        .dro-step-text { color: #cbd5e1; margin-bottom: 8px; line-height: 1.35; }
        #dro-hitl-btn {
            display: none;
            width: 100%;
            padding: 7px 10px;
            margin-bottom: 10px;
            background: #f59e0b;
            color: #111827;
            border: none;
            border-radius: 8px;
            font-weight: 700;
            font-size: 12px;
            cursor: pointer;
        }
        .dro-log-list {
            max-height: 150px;
            overflow-y: auto;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            padding-top: 8px;
            display: flex;
            flex-direction: column;
            gap: 5px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 11px;
        }
        .dro-log-item { color: #94a3b8; line-height: 1.3; }
        .dro-log-item.success { color: #34d399; }
        .dro-log-item.warn { color: #fbbf24; }
        .dro-log-item.error { color: #f87171; }
    `;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'dro-runner-hud';
    root.innerHTML = `
        <div id="dro-hud-drawer">
            <div class="dro-drawer-head">
                <span>Collector Live Feed</span>
                <span id="dro-hud-counter">0 / 0</span>
            </div>
            <div class="dro-drawer-body">
                <div class="dro-step-text" id="dro-hud-step">Waiting for collector sweep...</div>
                <div class="dro-progress-track"><div class="dro-progress-fill" id="dro-hud-bar"></div></div>
                <button id="dro-hitl-btn">Mark Security Check Cleared</button>
                <div class="dro-log-list" id="dro-hud-logs"></div>
            </div>
        </div>
        <div id="dro-hud-pill" title="Toggle Automation Live Feed">
            <span class="dro-dot" id="dro-hud-dot"></span>
            <span id="dro-hud-label">Runner Standby</span>
        </div>
    `;
    document.body.appendChild(root);

    const pill = document.getElementById('dro-hud-pill');
    const drawer = document.getElementById('dro-hud-drawer');
    const dot = document.getElementById('dro-hud-dot');
    const label = document.getElementById('dro-hud-label');
    const counter = document.getElementById('dro-hud-counter');
    const stepEl = document.getElementById('dro-hud-step');
    const bar = document.getElementById('dro-hud-bar');
    const hitlBtn = document.getElementById('dro-hitl-btn');
    const logsEl = document.getElementById('dro-hud-logs');

    let latestState = null;

    pill.addEventListener('click', () => drawer.classList.toggle('open'));

    hitlBtn.addEventListener('click', async () => {
        if (!latestState?.currentSite) return;
        await fetch(LOCAL_CLEAR_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ casinoId: latestState.currentSite })
        }).catch(() => {});
    });

    function playChime(freq = 587.33) {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.06, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.36);
        } catch (_) {}
    }

    function render(data) {
        const prevStatus = latestState?.status;
        latestState = data;

        dot.className = 'dro-dot';
        if (data.status === 'RUNNING') {
            dot.classList.add('running');
            label.textContent = `LIVE • ${data.completedCount}/${data.totalCount}${data.currentSite ? ` (${data.currentSite})` : ''}`;
        } else if (data.status === 'WAITING_JITTER') {
            dot.classList.add('jitter');
            label.textContent = `PACING • ${data.completedCount}/${data.totalCount}`;
        } else if (data.status === 'HITL_PAUSED') {
            dot.classList.add('hitl');
            label.textContent = `ACTION NEEDED • ${data.currentSite || 'Check'}`;
            drawer.classList.add('open');
            if (prevStatus !== 'HITL_PAUSED') playChime(440);
        } else if (data.status === 'COMPLETED') {
            dot.classList.add('done');
            label.textContent = `Sweep Done (${data.completedCount})`;
            if (prevStatus === 'RUNNING') playChime(783.99);
        } else {
            label.textContent = 'Runner Standby';
        }

        counter.textContent = `${data.completedCount || 0} / ${data.totalCount || 0}`;
        stepEl.textContent = data.step || 'Standby';
        const pct = data.totalCount > 0 ? Math.min(100, Math.round((data.completedCount / data.totalCount) * 100)) : 0;
        bar.style.width = `${pct}%`;

        hitlBtn.style.display = data.status === 'HITL_PAUSED' ? 'block' : 'none';

        if (Array.isArray(data.logs)) {
            logsEl.innerHTML = data.logs.map(entry => {
                const time = new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                return `<div class="dro-log-item ${entry.level || ''}">[${time}] ${entry.message}</div>`;
            }).join('');
        }
    }

    function connectSSE() {
        const es = new EventSource(LOCAL_SSE_URL);
        es.onmessage = (evt) => {
            try { render(JSON.parse(evt.data)); } catch (_) {}
        };
        es.onerror = () => {
            es.close();
            setTimeout(connectSSE, 6000);
        };
    }

    connectSSE();
})();

# Plan: Reset-time checker and fast drop alert

Base: `main` @ d8adbad. Both are plans only; nothing built yet.

---

## 1. Reset-time checker (automation-service)

**Goal:** the collector already visits each allowlisted platform. Use those
visits to check the catalogue's reset rule (`resetHour` + `resetTZ`, or
`cooldown` hours) against what the site actually does, and propose corrections
through the existing review path. Never edit the catalogue directly.

**Where it plugs in**

| Piece | Today | Change |
|---|---|---|
| `automation-service/src/ExecutorModule.js` | Returns `rewardAvailable` (Claim button seen) and `claimed` | Also return any countdown it can read on the page ("Next reward in 05:12:40", "Available at 5:00 AM") and the page time it was read |
| `automation-service/src/StateStore.js` | Local ledger of claims and backoff | Add a local `observations` log per platform: visited at, button present, countdown read, claimed at |
| New `automation-service/src/ResetChecker.js` | - | Infers the real rule from observations and compares it with the catalogue rule |
| `catalog_sweep_findings` (existing table) | Catalogue sweeps file proposed changes here; applied in batch PRs | Checker files a finding: `platform_name`, `verdict` (`reset_mismatch`), `proposed_changes` (`{resetHour, resetTZ}` or `{cooldown}`), `sources` (`[{type: "collector", observations: [...]}]`), `summary`, status pending |

**How it infers a rule**
- **Rolling cooldown:** claimed at T, then a countdown read later says ready at T'. T' − T ≈ the cooldown. Several claims agreeing within ±15 min gives the value.
- **Fixed daily reset:** the button reappears (or the countdown points) at the same wall-clock hour in a time zone across days, regardless of when the claim was made.
- **Countdowns beat button watching.** One countdown read pins the reset to the minute. Button presence only brackets it between two visits (hours apart), so button-only evidence needs more days.

**Guards against false findings**
- At least 3 consistent observations on 3 different days before filing anything.
- Ignore visits that hit a checkpoint, were signed out (no button and no countdown), or errored.
- One open finding per platform at a time; re-file only if the evidence changes.
- Sister sites (the A1 cluster) are judged per site. Sharing a processor doesn't mean sharing a reset.

**Tests:** inference from synthetic observation sets (rolling 24h, rolling 4h, fixed 5 AM CT across DST, mixed/noisy, too few days → nothing filed); countdown-text parsing; finding payload shape.

**Size:** M (4 files + tests). Low risk: it only proposes, and the sweep review stays in charge.

---

## 2. Fast drop alert (first-come drops like Jackpot Rabbit)

**Goal:** know within seconds when a first-come drop posts, and claim it yourself.
The bot never claims these: first-come drops are a race against other players.

**Option A (recommended, no build): Discord's own notifications**
1. In the server where the drop is posted (or the channel you follow it into), long-press the channel → Notification settings → **All Messages**.
2. Give that channel a distinct notification sound (Android: channel notification settings; iOS: per-server).
3. If the drops come from a specific person or bot account, Discord can't alert on one poster in a busy channel. Option B handles that case.

Latency: instant (Discord's own push). Works on any channel you can see, including non-announcement channels the bot can't read.

**Option B (only if A is too noisy): filtered alert listener**
- An always-on listener in `automation-service` (runs while your computer is on) connected to Discord's live gateway with the same bot. It can only see your own server, so the drop channel must be followed in.
- **Filter:** a post in the watched channel that has a link or code, optionally only from named posters (the casino's own account or bot).
- **Alert:** posts `@you` in a private alert channel with the platform name only, never the link, so the alert can't claim on its own. Optional phone push via your site's existing web-push.
- Never claims and never opens the link; it is purely the alarm.
- **Size:** S-M (listener + filter + tests). Needs the computer on; a small always-on host is the alternative if that matters.

**Not doing:** auto-claiming first-come drops, or watching a person's activity outside your own server.

---

## Order
1. Option A now (two minutes in Discord settings).
2. Reset checker once the collector runs live (it needs real visits to learn from).
3. Option B only if A turns out too noisy.

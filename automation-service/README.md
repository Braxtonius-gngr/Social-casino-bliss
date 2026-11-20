# automation-service

The collector: visits your allowlisted platforms in SC-tier order, claims the daily bonus when it's due, and stays in step with your dailyrollover.com deck. Runs on your own computer; nothing here ships with the site.

## How it stays in sync with the site

| What | Where it lives | Who writes / reads |
|---|---|---|
| When a platform is next due | Your deck (`tracked_games_snapshot`): each platform's `resetHour` + `resetTZ` or `cooldownHours`, and `lastCollected` | The runner reads it and decides "due" with the same rules as the site (`getCooldownState()` in `index.html`) |
| Claims | `collection_events`, one row per collect | You (tap in the app, any device) and the runner (`device_id` `automation-runner`, only after the Claim button was actually clicked). The site moves the card's timer forward when a newer collection arrives |
| Runner status and checkpoints | `automation_runner` (one row, your account) | The runner writes it; the site's owner panel reads it and clears a checkpoint through owner-only functions. Browsers have no other access |
| Backoff after a checkpoint | `data/tandem-state.json` (local) | The runner only. A clean visit ends it |

A site in the catalog is `{ id, name, url, scTier, resetHour?, resetTZ?, cooldownHours? }`. `name` must match the platform's name in your deck exactly; the deck's rule then wins over the local fields. A domain not in `allowedDomains` is never visited.

## Setup

1. Apply `supabase/migrations/20261119010000_automation_runner.sql` to your project (it adds only the `automation_runner` table and two owner-only functions).
2. `cp .env.example .env` and fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `DRO_OWNER_USER_ID` (your user id). Without all three the runner keeps a local ledger only and writes nothing remote. The service-role key bypasses row security; every query is pinned to `DRO_OWNER_USER_ID`, and `.env` must never be committed.
3. `npm install`, then `node test-run.js` for a dry run: no browser, no proxy probe, nothing claimed or recorded, and nothing written to `automation_runner` (its status stays on the local feed).
4. Set `LIVE_BROWSER=true` (and `autoClick: true` on the account) to claim for real. With no real proxy in `PROXY_POOL` it warns that visits use your own connection.

## Checkpoints

When a CAPTCHA, browser check or 2FA prompt appears, the runner pauses up to 3 minutes and alerts Discord (if `DISCORD_WEBHOOK_URL` is set). Finish the check in its browser window, then clear it with Enter in the terminal, the live panel on dailyrollover.com (owner only, same computer), or CLEAR CHECKPOINT in the owner panel from any device. Uncleared, the site backs off (4h, 24h for 2FA, doubling per uncleared repeat up to 16x) until a clean visit; a checkpoint cleared in its window adds no backoff.

Enter-key clearance needs a real terminal. Under pm2, systemd or Docker there is no TTY, so the runner says so at start and only the live panel and CLEAR CHECKPOINT work; those survive a service manager.

## Discord pull (`discord-pull.js`)

A second process, apart from the runner: it polls one normal Discord text channel over the REST API (no gateway, no privileged intent) and sends each new batch of posts - up to 4 pictures with the text posted beside them - to the `ingest-drop` function, which has `read-drop` read it once and files the result in `drop_drafts`. It publishes nothing: open the admin page's **Pull Drafts**, load a draft into the form, check it against the post, then SAVE (ticking NOTIFY if it should alert).

- No picture, no read: a text-only post rides along as context with the next batch that has one, even on a later tick (it waits in the ledger, at most 20 posts and 6 hours, the oldest dropped first).
- One read per batch, deduped by the batch's message ids before the read; the ledger (`data/discord-pull.json`) moves past a batch only once it is filed, so a failed batch is tried again next tick. A batch `read-drop` can't read (a refusal, an unreadable picture) is filed as skipped, so it is never paid for twice.
- Pictures are sent as base64; Discord's CDN links stop working after about a day.

Setup: fill the Discord pull block in `.env` (the bot needs View Channel + Read Message History on the source channel only), set the same `INGEST_TOKEN` as a Supabase secret (both `ingest-drop` and `read-drop` read it), apply `20261119040000_drop_drafts.sql`, deploy `ingest-drop --no-verify-jwt`, then:

```bash
node discord-pull.js --dry    # seeds the ledger at the newest post; spends no reads
node discord-pull.js --once   # one tick, after posting a real offer
node discord-pull.js          # keeps polling (run it under the same service manager as the runner)
```

It replaces the `pull-drops` function, which published drops on its own; `20261119040100_unschedule_pull_drops.sql` stops its schedule.

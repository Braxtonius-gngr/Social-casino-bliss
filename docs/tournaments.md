# Tournament desk

This is the owner's private tracker for leaderboard tournaments, races and
raffles on sweepstakes casinos. It covers what is running, what it pays,
which games suit it, whether it is worth playing, and what the history says
about the field. The PWA doesn't use it. Everything lives in Supabase
(project `ewfvyrhlsanzkmozrmhs`) behind RLS with no browser grants, the same
as `catalog_sweep_findings` and `bug_reports`.

The method (formats, extraction, math, decision cards) lives in the
**tournament-desk** skill on the owner's Claude account. This page covers the
moving parts.

## Data flow

| When (CT) | Job | Reads | Writes |
|---|---|---|---|
| 7:57 AM | Daily catalog sweep | platform pages | `catalog_sweep_findings` |
| 8:17 AM | **Daily tournament desk** | tournament sites (dedicated ones on their cadence), the sites the sweep checked today, a few candidates | `tournament_*` tables, `tournaments.decision` |
| 8:44 AM | Daily way forward | sweep findings, bug reports, `tournament_board` | nothing (one brief file + push) |

Discovery rides along with the daily scrub. Every platform the sweep checks
that morning also gets a tournament check, and so do a few `candidate` sites
a day (`tournament_settings.sweep_candidates_per_day`). The whole catalogue
gets looked at once a lap.

A site moves through these statuses:

`candidate` (suspected) → `rotation` (confirmed, still found by the daily
checks) → `dedicated` (graduated: checked every `cadence_days` on its own) or
`none` (no tournaments; looked at again after 30 days). `paused` and `gone`
are set by hand.

A site graduates when `tournament_graduation_candidates.ready` is true. That
needs 3 events of one format within 21 days, or 5 events of any format within
30 days, plus public promo pages. Luck Party started as `dedicated` with a
daily cadence.

## Tables

| Table | One row per |
|---|---|
| `tournament_formats` | scoring format (`volume_wager`, `spin_count`, `max_multiplier`, `target_multiplier`, `max_win`, `sum_multipliers`, `total_win`, `ratio`, `points_custom`, `raffle`, `prize_drop`, `team`) |
| `tournament_sites` | casino: status, cadence, promo/winners/rules URLs, sweeps unit and `units_per_usd` (FC = 100), excluded states |
| `tournaments` | event instance, keyed `(site_id, slug, ends_at)`, with `format_params`, game scope, prize totals and the latest `decision` card |
| `tournament_payout_tiers` | rank range and prize per place |
| `tournament_games` | game on a site: categories seen, published and on-site RTP, volatility, max win, min SC bet, measured spins/hour |
| `tournament_eligible_games` | event ↔ game |
| `tournament_snapshots` | observation: leaderboard values, last-paid threshold, published winners |
| `tournament_entries` | the owner's own entry and result |
| `tournament_settings` | default/pessimistic edge, reference bet, weekly loss limit, rotation size, graduation rule |

Views:

- `tournament_board`: open events with their decision card.
- `tournament_tier_math`: break-even wager and spins per paid rank, at 4% and 6% edge.
- `tournament_site_profile`: per site and format, the usual end day and time, average length and pool, and the share of wins taken by repeat winners.
- `tournament_repeat_winners`
- `tournament_graduation_candidates`

## Setup

1. Migration: `supabase/migrations/20261002080000_tournament_desk.sql`.
2. First data: `supabase/seed/tournaments_luckparty.sql`. It loads Luck Party
   (115 games across the Hot, Featured, Party Time and Hit It tabs; the six
   events from the September and October pages; 40 Victory Vault events from
   May 11 to Jul 6 with their winners) and 14 candidate sites from the
   research pass. It's safe to re-run. The seed is maintained directly; there
   is no checked-in generator. Edit the seed itself, keeping its upserts and
   delete-before-insert snapshot pattern idempotent.

Both run through the Supabase connector or the SQL editor. CI doesn't apply
migrations.

## Commands the owner can paste into any session

- `Apply tournament desk: run supabase/migrations/20261002080000_tournament_desk.sql then supabase/seed/tournaments_luckparty.sql on Supabase project ewfvyrhlsanzkmozrmhs, then run get_advisors.`
- `Log tournament entry <site> <slug> <end date>: spins <n>, wagered <sc>, best multiplier <x>, final rank <r>, prize <sc>, games <names>` (writes `tournament_entries`).
- `Tournament leaderboard <site> <slug>: <paste or screenshot>` (writes a `tournament_snapshots` row with the last-paid threshold and hours to end).
- `Set tournament weekly loss limit to <sc>` (writes `tournament_settings.weekly_loss_limit`).

## What the numbers mean

Every SC-staked format costs about `stake × house edge` in expectation. The
break-even line for a paid rank is `P(1−e)/e` of wager, where `P` is the
prize in USD and `e` the edge, net of the prize's own 1x playthrough. For
spin counts it's that line divided by the bet. For example, 1st in Max Total
Play (300 SC) breaks even at about 7,200 SC wagered at a 4% edge, or 4,700 SC
at 6%. A rank is only worth chasing when the volume it takes is under its
line. The free GC raffle ticket is the one entry that is positive every week.

The desk does not log in, does not play, and does not automate anything on a
casino. It reads public pages. Leaderboard values come from the owner's own
screenshots.

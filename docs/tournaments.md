# Tournament desk

This is the owner's private tracker for leaderboard tournaments, races and
raffles on sweepstakes casinos. It covers what is running, what it pays,
which games suit it, whether it is worth playing, and what the history says
about the field. The PWA doesn't use it. Everything lives in Supabase
(project `ewfvyrhlsanzkmozrmhs`) behind RLS with no browser grants, the same
as `catalog_sweep_findings` and `bug_reports`.

The method (formats, extraction, math, decision cards) lives in the
**tournament-desk** skill on the owner's Claude account. The standing play
rules live in the database (`tournament_settings.play_policy`), so every task
reads the same ones. This page covers the moving parts.

## Data flow

| When (CT) | Job | Reads | Writes |
|---|---|---|---|
| 7:57 AM | Daily catalog sweep | platform pages | `catalog_sweep_findings` |
| 8:15 AM | **Luck Party tournament desk** | Luck Party's promo pages, lobby tabs, Victory Vault | Luck Party's events, games, cards |
| 8:17 AM | **Daily tournament desk** | rotation sites (by priority), the sites the sweep checked today, a few candidates, in-app sites now and then | every other site's events and cards; site statuses |
| 8:44 AM | Daily way forward | sweep findings, bug reports, `tournament_board`, `tournament_data_gaps` | nothing (one brief file + push) |

A site moves through these statuses:

`candidate` (suspected) → `rotation` (confirmed; the general desk checks it
every `rotation_recheck_days`, in `rotation_priority` order) → `dedicated`
(graduated) or `none` (no tournaments; looked at again after
`none_recheck_days`). `paused` and `gone` are set by hand.

- **Own task.** A graduated site gets its own daily scheduled task, recorded in
  `tournament_sites.own_task`, and the general desk then leaves it alone. Until
  the owner creates that task (the brief offers a `Create site task` command),
  the general desk covers the site.
- **In-app sites.** `public_pages = false` means the tournaments are only
  visible inside the app. Their events come from the owner's screenshots, and
  the desk only rechecks them for a public page every `in_app_recheck_days`.
- **Graduation.** `tournament_graduation_candidates.ready`: 3 events of one
  format within 21 days, or 5 events of any format within 30 days, plus public
  promo pages.

Owner decisions, 2026-10-02: Luck Party graduated with its own task (8:15 AM
CT). Zula and Fortune Wins (public operator tournament pages) went into
rotation first, then Stake.us (public promo pages). McLuck, Pulsz, Spree and
Crown Coins are in-app sites.

## Play policy (`tournament_settings.play_policy`)

1. Always take the free GC raffle entry.
2. Route SC already planned for the day (daily bonus and its playthrough) into
   whichever SC event is live, so its prize equity rides free.
3. Play Hit the Multiplier early (first 3 hours) and capped (200 minimum-bet
   spins).
4. Contest Max Total Play or Max Spins only for the cheapest paid rank whose
   observed last-paid threshold, projected to the end, sits below its
   break-even line.
5. Max Multiplier is incidental unless the field's spins look under
   `pool x (1-e) / (e x bet)`: about 72,000 for a 300 SC pool at 0.10 SC and
   4% (the owner's round number is 75,000).

Until a site has the three missing datasets, every EV figure on its cards is
a template, and the cards say `data_status: template`:

- in-game minimum SC bet and RTP per game;
- last-paid thresholds by hours-to-end;
- measured spins per hour.

Change a rule with an `update` on that row. Re-running the migration
leaves an existing row alone.

## Tables

| Table | One row per |
|---|---|
| `tournament_formats` | scoring format (`volume_wager`, `spin_count`, `max_multiplier`, `target_multiplier`, `max_win`, `sum_multipliers`, `total_win`, `ratio`, `points_custom`, `raffle`, `prize_drop`, `team`) |
| `tournament_sites` | casino: status, own task, rotation priority, cadence, promo/winners/rules URLs, sweeps unit and `units_per_usd` (FC = 100), excluded states |
| `tournaments` | event instance, keyed `(site_id, slug, ends_at)`, with `format_params`, game scope, prize totals and the latest `decision` card |
| `tournament_payout_tiers` | rank range and prize per place |
| `tournament_games` | game on a site: categories seen, published and in-game RTP, volatility, max win, min SC bet, paylines, measured spins/hour |
| `tournament_game_observations` | one owner reading (min bet, RTP, paylines, pace). A trigger copies it onto `tournament_games`: latest min bet, RTP and paylines, median pace |
| `tournament_eligible_games` | event ↔ game, with a shared `site_id` enforced by composite foreign keys |
| `tournament_snapshots` | observation: leaderboard values, last-paid threshold, published winners |
| `tournament_entries` | the owner's own entry and result |
| `tournament_settings` | edges, reference bet, weekly loss limit, play policy, planned daily SC, recheck intervals, graduation rule |

Views:

- `tournament_board`: open events with their decision card.
- `tournament_tier_math`: break-even wager and spins per paid rank, at 4% and 6% edge.
- `tournament_event_math`: per-event lines for the other formats: Max Multiplier field size, raffle SC-ticket break-even ticket count, capped Hit the Multiplier cost.
- `tournament_threshold_curve`: last-paid thresholds by hours-to-end bucket, with the median growth to the final.
- `tournament_data_gaps`: what only the owner can collect, most urgent first, each with its command.
- `tournament_site_profile`: per site and format, the usual end day and time, average length and pool, and the share of wins taken by repeat winners.
- `tournament_repeat_winners`
- `tournament_graduation_candidates`

## Setup

1. Migrations: `supabase/migrations/20261002080000_tournament_desk.sql`, then
   `supabase/migrations/20261002100000_tournament_play_policy.sql`.
2. Data: `supabase/seed/tournaments_luckparty.sql`. It loads Luck Party and 14
   candidate sites from the research pass, then the owner's 2026-10-02 site
   decisions. For Luck Party it has:
   - 168 games. The Oct 2 Hot, Featured, Party Time and Hit It tabs were read
     from the lobby pages' embedded data, taking the majority version across
     repeated reads; the rest are games seen in the September screenshots.
   - The six events from the September and October pages, with payout tiers
     and the games each was open to.
   - 65 Victory Vault events from Apr 2 to Jul 6 with their winners. Those are
     all the page has: nothing before Apr 2, and it stopped updating after
     Jul 6. April blocks give only an end date, so their start comes from the
     weekly slot (`format_params.times_assumed` says so).

   It's safe to re-run: dated observations are replaced, event status follows
   the dates, and existing decision cards and newer site timestamps are retained.
   The seed is maintained directly; there is no checked-in generator. Edit the seed itself, keeping its upserts and
   delete-before-insert snapshot pattern idempotent.

Lobby tabs rotate hard. Party Time went from 24 gold-themed games in
September to 12 Jili games on Oct 2. So the desk replaces a tab's
membership each time it reads it, and freezes each event's eligible games
while the event is live. Game lists come from the raw page data
(`__NEXT_DATA__`), not from a summarising fetch. The site also serves two
different cached versions of the lobby: on Oct 2, reads minutes apart shared
only 25 of 48 Hot games and 15 of 55 Featured games. So the desk reads a tab
more than once, takes the majority, and has the owner confirm in the app.

All of these run through the Supabase connector or the SQL editor. CI doesn't apply
migrations. The connector refuses SQL that contains the word "drop", so the
migrations use `create or replace` throughout, and large seeds go in small
insert-only chunks.

## Commands the owner can paste into any session

- `Apply tournament desk: run supabase/migrations/20261002080000_tournament_desk.sql, supabase/migrations/20261002100000_tournament_play_policy.sql, then supabase/seed/tournaments_luckparty.sql on Supabase project ewfvyrhlsanzkmozrmhs, then run get_advisors.`
- `Tournament game facts <site> <game>: min <sc>, rtp <percent>[, lines <n>]`. Inserts `tournament_game_observations` rows (`min_bet`, `rtp`, `paylines`, source `owner`). Read them from the game's info/paytable screen in SC mode.
- `Tournament pace <site> <game>: <spins> spins in <minutes> min`. Inserts a `pace` observation of `spins x 60 / minutes` spins per hour.
- `Tournament leaderboard <site> <slug>: <paste or screenshot>`. Writes a `tournament_snapshots` row with source `screenshot`, the screenshot's time, `hours_to_end`, the values per rank in `leaderboard` and the last paid place's value in `threshold_last_paid`. For an in-app site with no event row yet, it first creates the event from the screenshot (`seen_by = 'screenshot'`).
- `Log tournament entry <site> <slug> <end date>: spins <n>, wagered <sc>, best multiplier <x>, final rank <r>, prize <sc>, games <names>`. Writes `tournament_entries`.
- `Set planned daily SC to <sc>`. Writes `tournament_settings.planned_daily_sc`, which sizes the "Today's play" routing line.
- `Set tournament weekly loss limit to <sc>`. Writes `tournament_settings.weekly_loss_limit`.
- `Create site task <slug>`. Copies the Luck Party tournament desk scheduled task for that site, adapts its site section, and sets `tournament_sites.own_task`.

## What the numbers mean

Every SC-staked format costs about `stake × house edge` in expectation. The
break-even line for a paid rank is `P(1−e)/e` of wager, where `P` is the
prize in USD and `e` the edge, net of the prize's own 1x playthrough. For
spin counts it's that line divided by the bet in USD (`bet_used`): an event's
`min_bet` is converted from the site's sweeps units, with `reference_min_bet`
as a positive USD fallback. Nonpositive event bets have undefined (NULL) spin
limits. For example, 1st in Max Total
Play (300 SC) breaks even at about 7,200 SC wagered at a 4% edge, or 4,700 SC
at 6%. A rank is only worth chasing when the volume it takes is under its
line.

In a top-N multiplier race, S spins of your own against N field spins win
about S/N of the pool, so they pay while N is under `pool x (1-e) / (e x bet)`.
The raffle's SC ticket pays while fewer than `pool / (sc_spins x bet x e)`
tickets are entered: 625 for this week's 500 SC raffle at 0.10 SC. The free
GC raffle ticket is the one entry that is positive every week.

What the Apr 2 – Oct 2 history shows on Luck Party:

- **Weekend slot.** The Fri→Mon slot pays 10 places and rotates format. It
  was Max Total Play 7 times, plus twice each Max Spins and Hit the
  Multiplier, and once Max Multiplier.
- **Repeat winners.** Repeat winners take 35% of Max Spins wins and 16% of
  Max Total Play wins, but 8% or less in the luck formats. One display name
  won 11 times across four formats.

The desk does not log in, does not play, and does not automate anything on a
casino. It reads public pages. Leaderboard values and in-game facts come from
the owner's own screenshots and readings.

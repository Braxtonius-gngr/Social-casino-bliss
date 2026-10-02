-- Tournament desk: leaderboard tournaments, races and raffles on sweepstakes
-- casinos, kept so the owner can see what is running, what it pays, which
-- games suit it, and whether it is worth playing at all.
--
-- Fed by two unattended jobs, written with the service role over the
-- Supabase connector:
--   * the daily catalog sweep, which looks for tournament pages on the
--     platforms it already visits and records any site it finds here
--     (status 'candidate' -> 'rotation'), and
--   * the daily tournament desk task, which reads every site whose status is
--     'dedicated' on its own cadence, upserts events, payout tiers, eligible
--     games and observations, and writes a decision card per open event.
-- The daily way-forward brief reads tournament_board. The PWA never reads
-- any of this: RLS is on and the browser roles have no grants, the same as
-- catalog_sweep_findings and bug_reports. The method lives in the
-- tournament-desk skill and docs/tournaments.md.
--
-- Amounts: prize_sweeps / *_sweeps columns are in the site's own sweeps
-- unit as printed on the page (SC on Luck Party, FC on Fortune Wins).
-- tournament_sites.units_per_usd converts them (SC = 1, FC = 100). GC has no
-- cash value and is kept only for completeness.

-- ---------------------------------------------------------------------
-- Formats: what a leaderboard ranks by. Extend with a new row; the desk
-- maps unfamiliar rule text to 'points_custom' and flags it for review.
-- ---------------------------------------------------------------------
create table if not exists public.tournament_formats (
  code              text primary key,
  label             text        not null,
  score_metric      text        not null,
  bet_size_matters  boolean,                              -- null = depends on the site's rules
  notes             text
);

insert into public.tournament_formats (code, label, score_metric, bet_size_matters, notes) values
  ('volume_wager',      'Total play / wager race',     'sum of stakes over the event',                       true,  'Luck Party "Max Total Play" / "Max Play". Expected cost = wager x house edge.'),
  ('spin_count',        'Most spins',                  'number of qualifying spins',                         false, 'Luck Party "Max Spins". Minimum bet maximises spins per unit of expected loss.'),
  ('max_multiplier',    'Highest single multiplier',   'max(win / bet) on one spin',                         false, 'Luck Party "Max Multiplier". Lever is spin count x heavy-tailed games.'),
  ('target_multiplier', 'Hit / closest to a target',   'first N to hit X, then the N closest',               false, 'Luck Party "Hit the Multiplier". Early play matters; game must be able to land on X.'),
  ('max_win',           'Biggest single win',          'largest single win in coins',                        true,  'Luck Party "Max Win". Bet size scales the win, so it behaves like a volume race with a tail.'),
  ('sum_multipliers',   'Sum of multipliers',          'sum of win / bet over qualifying spins (often capped)', false, 'Pragmatic-style daily tournaments.'),
  ('total_win',         'Total or net win',            'sum of wins, or net win, over the event',            true,  null),
  ('ratio',             'Win-to-play ratio',           'total win / total play',                             false, 'Blackjack seat tournaments (Hello Millions, McLuck).'),
  ('points_custom',     'Site-defined points',         'points per the site''s own table',                   null,  'Fallback. Copy the points table into format_params.points.'),
  ('raffle',            'Raffle / ticket draw',        'tickets earned per threshold, drawn at random',      false, 'Luck Party "Weekly Spin Raffle". EV per ticket = pool / total tickets.'),
  ('prize_drop',        'Random prize drops',          'random awards on qualifying spins',                  false, null),
  ('team',              'Team / house battle',         'team points; prizes to the winning team',            null,  'Sportzino "Team Battle".')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- Sites: one row per casino that runs (or may run) tournaments.
-- status:
--   candidate  suspected (research or a sweep hint), not confirmed yet
--   rotation   confirmed; still picked up by the daily catalog sweep
--   dedicated  graduated; the tournament desk task reads it every cadence_days
--   none       checked, no tournaments found; the sweep looks again after 30 days
--   paused     owner paused it
--   gone       site closed, left the owner's state, or stopped tournaments
-- ---------------------------------------------------------------------
create table if not exists public.tournament_sites (
  id                 bigint generated always as identity primary key,
  slug               text        not null unique,          -- 'luckparty'
  name               text        not null,
  catalog_name       text,                                 -- exact data/catalog.json entry name, when listed
  operator_family    text,                                 -- e.g. 'blazesoft': same promo-page format across sites
  base_url           text,
  promo_index_url    text,
  winners_url        text,
  rules_url          text,
  event_tz           text        not null default 'America/New_York',
  sweeps_unit        text        not null default 'SC',
  units_per_usd      numeric     not null default 1 check (units_per_usd > 0),
  playthrough_x      numeric,
  min_redeem_sweeps  numeric,
  excluded_states    text[]      not null default '{}',
  states_checked_on  date,
  public_pages       boolean,                              -- promo pages readable without logging in
  status             text        not null default 'candidate'
                       check (status in ('candidate','rotation','dedicated','none','paused','gone')),
  cadence_days       integer     check (cadence_days between 1 and 14),
  graduated_at       timestamptz,
  last_checked_at    timestamptz,
  last_event_seen_at timestamptz,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Tournaments: one row per event instance. Keyed by (site, slug, ends_at)
-- because sites reuse a slug every week. slug_confirmed is false when the
-- slug was made up (backfill from a winners page, a screenshot); the desk
-- replaces it with the real one when it sees the page, matching on
-- (site_id, ends_at, format_code).
-- ---------------------------------------------------------------------
create table if not exists public.tournaments (
  id                 bigint generated always as identity primary key,
  site_id            bigint      not null references public.tournament_sites (id) on delete cascade,
  slug               text        not null,
  slug_confirmed     boolean     not null default true,
  name               text        not null,
  format_code        text        not null references public.tournament_formats (code),
  format_params      jsonb       not null default '{}'::jsonb, -- {"top_n":5} {"target_x":9.1,"first_n":5,"closest_n":5} {"gc_spins":5000,"sc_spins":200,"max_tickets":2}
  currency_mode      text        check (currency_mode in ('SC','GC','both','other')),
  game_scope         text,                                 -- 'category:Hot' | 'game:<name>' | 'provider:<name>' | 'all'
  starts_at          timestamptz,
  ends_at            timestamptz,
  status             text        not null default 'upcoming'
                       check (status in ('upcoming','live','ended','results_posted','cancelled')),
  total_prize_sweeps numeric,
  total_prize_gc     numeric,
  paid_places        integer,
  entry_requirement  text,                                 -- 'Join Now opt-in', 'min bet 0.20 SC', ...
  rules_text         text,
  source_url         text,
  last_updated_on    date,                                 -- the page's own "Last updated"
  seen_by            text        check (seen_by in ('sweep','desk','manual','backfill','screenshot')),
  first_seen_at      timestamptz not null default now(),
  last_seen_at       timestamptz not null default now(),
  decision           jsonb,                                -- latest decision card (see the skill)
  decision_at        timestamptz,
  triage_status      text        not null default 'new'
                       check (triage_status in ('new','reviewed','acted','ignored')),
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint tournaments_site_slug_end_key unique nulls not distinct (site_id, slug, ends_at)
);

create index if not exists tournaments_open_idx on public.tournaments (status, ends_at);
create index if not exists tournaments_site_idx on public.tournaments (site_id, ends_at desc);

create table if not exists public.tournament_payout_tiers (
  id             bigint generated always as identity primary key,
  tournament_id  bigint  not null references public.tournaments (id) on delete cascade,
  rank_from      integer not null check (rank_from >= 1),
  rank_to        integer not null,
  prize_sweeps   numeric not null default 0,               -- per place, in the site's sweeps unit
  prize_gc       numeric not null default 0,               -- per place
  prize_other    text,
  constraint tournament_payout_tiers_range check (rank_to >= rank_from),
  constraint tournament_payout_tiers_unique unique (tournament_id, rank_from)
);

-- ---------------------------------------------------------------------
-- Games, per site (min bet, on-site RTP and categories are site facts).
-- ---------------------------------------------------------------------
create table if not exists public.tournament_games (
  id               bigint generated always as identity primary key,
  site_id          bigint      not null references public.tournament_sites (id) on delete cascade,
  name             text        not null,
  provider         text,
  categories       text[]      not null default '{}',     -- lobby tabs it was seen under
  is_exclusive     boolean     not null default false,
  rtp_published    numeric     check (rtp_published between 50 and 100), -- provider default, percent
  rtp_onsite       numeric     check (rtp_onsite between 50 and 100),    -- read from the in-game paytable here
  rtp_source       text,
  volatility       text        check (volatility in ('low','low-medium','medium','medium-high','high','very-high')),
  max_win_x        numeric,
  hit_freq         numeric,                               -- percent of spins that pay
  base_game_pays   boolean,                               -- false for bonus-only games
  min_bet_sweeps   numeric,                               -- smallest SC-mode bet on this site
  spins_per_hour   numeric,                               -- measured by the owner
  notes            text,
  updated_at       timestamptz not null default now(),
  constraint tournament_games_site_name_key unique (site_id, name)
);

create table if not exists public.tournament_eligible_games (
  tournament_id  bigint not null references public.tournaments (id) on delete cascade,
  game_id        bigint not null references public.tournament_games (id) on delete cascade,
  primary key (tournament_id, game_id)
);

create index if not exists tournament_eligible_games_game_idx on public.tournament_eligible_games (game_id);

-- ---------------------------------------------------------------------
-- Observations over time: leaderboard thresholds, winners lists.
-- ---------------------------------------------------------------------
create table if not exists public.tournament_snapshots (
  id                   bigint generated always as identity primary key,
  tournament_id        bigint      not null references public.tournaments (id) on delete cascade,
  observed_at          timestamptz not null default now(),
  source               text        not null check (source in ('sweep','desk','manual','winners_page','backfill','screenshot')),
  hours_to_end         numeric,
  leaderboard          jsonb,                              -- [{"rank":1,"value":12345}] - values, not names
  threshold_last_paid  numeric,                            -- score of the last paid place, in the format's metric
  winners              text[],                             -- display names as published (first name + initial)
  winners_count        integer,
  raw_excerpt          text,
  run_session          text
);

create index if not exists tournament_snapshots_tournament_idx on public.tournament_snapshots (tournament_id, observed_at desc);

-- ---------------------------------------------------------------------
-- The owner's own entries and results: the best data the desk will have.
-- ---------------------------------------------------------------------
create table if not exists public.tournament_entries (
  id                 bigint generated always as identity primary key,
  tournament_id      bigint      not null references public.tournaments (id) on delete cascade,
  decision           text        check (decision in ('play_to_place','incidental','free_entry_only','skip')),
  games              text[]      not null default '{}',
  sweeps_wagered     numeric,
  spins              integer,
  best_multiplier    numeric,
  net_result_sweeps  numeric,                             -- balance change from play, prize excluded
  final_rank         integer,
  prize_sweeps       numeric,
  prize_gc           numeric,
  hours_played       numeric,
  multipliers_seen   jsonb,                               -- [{"game":"...","x":9.1}] for target-multiplier work
  notes              text,
  created_at         timestamptz not null default now()
);

create index if not exists tournament_entries_tournament_idx on public.tournament_entries (tournament_id);

-- ---------------------------------------------------------------------
-- Settings the math and the decision cards read. One row per key.
-- ---------------------------------------------------------------------
create table if not exists public.tournament_settings (
  key         text primary key,
  value       jsonb       not null,
  note        text,
  updated_at  timestamptz not null default now()
);

insert into public.tournament_settings (key, value, note) values
  ('default_edge',        '0.04'::jsonb, 'House edge when the in-game paytable has not been read (RTP 96%).'),
  ('pessimistic_edge',    '0.06'::jsonb, 'Second case for every break-even line (RTP 94%), for lower-RTP sweeps builds.'),
  ('reference_min_bet',   '0.10'::jsonb, 'SC bet used for spin math when a game''s min_bet_sweeps is unknown.'),
  ('weekly_loss_limit',   'null'::jsonb, 'Owner-set weekly SC loss limit. When set, the desk will not recommend play_to_place past it.'),
  ('sweep_candidates_per_day', '3'::jsonb, 'How many candidate sites the daily catalog sweep checks for tournaments each day, besides its own batch.'),
  ('graduation_rule',     '{"same_format_events":3,"same_format_days":21,"any_events":5,"any_days":30}'::jsonb,
                          'A rotation site with this many dated events and public pages graduates to the desk.'),
  ('none_recheck_days',   '30'::jsonb, 'Days before a site marked none is checked again.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- updated_at, server-authoritative (same shape as the other touch triggers).
-- ---------------------------------------------------------------------
create or replace function public.tournament_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tournament_sites_touch on public.tournament_sites;
create trigger tournament_sites_touch before update on public.tournament_sites
  for each row execute function public.tournament_set_updated_at();
drop trigger if exists tournaments_touch on public.tournaments;
create trigger tournaments_touch before update on public.tournaments
  for each row execute function public.tournament_set_updated_at();
drop trigger if exists tournament_games_touch on public.tournament_games;
create trigger tournament_games_touch before update on public.tournament_games
  for each row execute function public.tournament_set_updated_at();
drop trigger if exists tournament_settings_touch on public.tournament_settings;
create trigger tournament_settings_touch before update on public.tournament_settings
  for each row execute function public.tournament_set_updated_at();

revoke all on function public.tournament_set_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Views the desk and the brief read.
-- ---------------------------------------------------------------------

-- Break-even lines per payout tier. A rank is worth chasing only when the
-- volume it takes is below its line:
--   wager line  W* = P(1-e)/e   (prize after its own 1x playthrough)
--   spins line  S* = W* / bet
-- Computed at the default and the pessimistic edge.
create or replace view public.tournament_tier_math
with (security_invoker = true) as
with s as (
  select
    coalesce((select (value #>> '{}')::numeric from public.tournament_settings where key = 'default_edge'), 0.04)      as e1,
    coalesce((select (value #>> '{}')::numeric from public.tournament_settings where key = 'pessimistic_edge'), 0.06)  as e2,
    coalesce((select (value #>> '{}')::numeric from public.tournament_settings where key = 'reference_min_bet'), 0.10) as ref_bet
)
select
  t.id                                   as tournament_id,
  ts.slug                                as site,
  t.name,
  t.format_code,
  t.ends_at,
  p.rank_from,
  p.rank_to,
  p.prize_sweeps,
  round(p.prize_sweeps / ts.units_per_usd, 2)                                   as prize_usd,
  round(p.prize_sweeps / ts.units_per_usd * (1 - s.e1) / s.e1, 0)               as breakeven_wager_usd,
  round(p.prize_sweeps / ts.units_per_usd * (1 - s.e2) / s.e2, 0)               as breakeven_wager_usd_pessimistic,
  coalesce((t.format_params ->> 'min_bet')::numeric / ts.units_per_usd, s.ref_bet) as bet_used,
  round(p.prize_sweeps / ts.units_per_usd * (1 - s.e1) / s.e1
        / coalesce((t.format_params ->> 'min_bet')::numeric / ts.units_per_usd, s.ref_bet), 0) as breakeven_spins,
  round(p.prize_sweeps / ts.units_per_usd * (1 - s.e2) / s.e2
        / coalesce((t.format_params ->> 'min_bet')::numeric / ts.units_per_usd, s.ref_bet), 0) as breakeven_spins_pessimistic
from public.tournament_payout_tiers p
join public.tournaments t       on t.id = p.tournament_id
join public.tournament_sites ts on ts.id = t.site_id
cross join s;

-- Open and upcoming events with their top prize and latest decision card.
create or replace view public.tournament_board
with (security_invoker = true) as
select
  t.id,
  ts.slug                                                    as site,
  ts.name                                                    as site_name,
  t.name,
  t.format_code,
  t.game_scope,
  t.currency_mode,
  t.status,
  t.starts_at,
  t.ends_at,
  to_char(t.ends_at at time zone 'America/Chicago', 'Dy Mon DD HH12:MI AM') || ' CT' as ends_ct,
  round(extract(epoch from (t.ends_at - now())) / 3600, 1)  as hours_left,
  round(t.total_prize_sweeps / ts.units_per_usd, 2)          as total_prize_usd,
  t.paid_places,
  (select round(max(p.prize_sweeps) / ts.units_per_usd, 2)
     from public.tournament_payout_tiers p where p.tournament_id = t.id) as top_prize_usd,
  t.decision,
  t.decision_at,
  t.source_url,
  t.triage_status
from public.tournaments t
join public.tournament_sites ts on ts.id = t.site_id
where (
    (t.status = 'upcoming' and t.ends_at > now())
    or (t.status = 'live' and t.ends_at > now())
  )
   or (t.status in ('ended','results_posted')
       and t.ends_at <= now()
       and t.ends_at > now() - interval '12 hours');

-- Per-site, per-format pattern profile: cadence, timing, pool size, field.
create or replace view public.tournament_site_profile
with (security_invoker = true) as
with w as (
  select t.site_id, t.format_code, sn.tournament_id, unnest(sn.winners) as winner
  from public.tournament_snapshots sn
  join public.tournaments t on t.id = sn.tournament_id
  where sn.winners is not null
),
wins as (
  select site_id, format_code, winner, count(distinct tournament_id) as n
  from w group by site_id, format_code, winner
),
field as (
  select site_id, format_code,
         sum(n)                                   as total_wins,
         count(*)                                 as distinct_winners,
         count(*) filter (where n >= 2)           as repeat_winners,
         sum(n) filter (where n >= 2)             as wins_by_repeaters
  from wins group by site_id, format_code
)
select
  ts.slug                                                          as site,
  t.format_code,
  count(*)                                                         as events,
  min(t.ends_at)                                                   as first_end,
  max(t.ends_at)                                                   as last_end,
  mode() within group (order by to_char(t.ends_at at time zone ts.event_tz, 'Dy'))   as usual_end_day,
  mode() within group (order by to_char(t.ends_at at time zone ts.event_tz, 'HH24:MI')) as usual_end_time_site_tz,
  round(avg(extract(epoch from (t.ends_at - t.starts_at)) / 3600), 1) as avg_hours,
  round(avg(t.total_prize_sweeps / ts.units_per_usd), 2)           as avg_pool_usd,
  round(avg(t.paid_places), 1)                                     as avg_paid_places,
  f.distinct_winners,
  f.total_wins,
  round(f.wins_by_repeaters::numeric / nullif(f.total_wins, 0), 2) as share_of_wins_by_repeaters
from public.tournaments t
join public.tournament_sites ts on ts.id = t.site_id
left join field f on f.site_id = t.site_id and f.format_code = t.format_code
where t.ends_at is not null and t.status <> 'cancelled'
group by ts.slug, t.format_code, f.distinct_winners, f.total_wins, f.wins_by_repeaters;

-- Winners who keep coming back: a thin, regular field shows up here.
create or replace view public.tournament_repeat_winners
with (security_invoker = true) as
select
  ts.slug                                       as site,
  w.winner,
  count(distinct sn.tournament_id)              as wins,
  array_agg(distinct t.format_code)             as formats,
  max(t.ends_at)                                as last_win
from public.tournament_snapshots sn
join public.tournaments t       on t.id = sn.tournament_id
join public.tournament_sites ts on ts.id = t.site_id
cross join lateral unnest(sn.winners) as w(winner)
group by ts.slug, w.winner
having count(distinct sn.tournament_id) >= 2;

-- Sites ready to graduate from the sweep rotation to the desk.
create or replace view public.tournament_graduation_candidates
with (security_invoker = true) as
with r as (
  select value as rule from public.tournament_settings where key = 'graduation_rule'
),
counts as (
  select t.site_id, t.format_code,
         count(*) filter (where t.first_seen_at > now() - make_interval(days => (select (rule ->> 'same_format_days')::int from r))
                             or t.ends_at      > now() - make_interval(days => (select (rule ->> 'same_format_days')::int from r))) as recent_same
  from public.tournaments t group by t.site_id, t.format_code
),
any_counts as (
  select t.site_id,
         count(*) filter (where t.first_seen_at > now() - make_interval(days => (select (rule ->> 'any_days')::int from r))
                             or t.ends_at      > now() - make_interval(days => (select (rule ->> 'any_days')::int from r))) as recent_any
  from public.tournaments t group by t.site_id
)
select
  ts.slug, ts.name, ts.status, ts.public_pages,
  coalesce(max(c.recent_same), 0)  as best_same_format_count,
  coalesce(a.recent_any, 0)        as any_format_count,
  (ts.public_pages is true
   and (coalesce(max(c.recent_same), 0) >= (select (rule ->> 'same_format_events')::int from r)
        or coalesce(a.recent_any, 0)    >= (select (rule ->> 'any_events')::int from r))) as ready
from public.tournament_sites ts
left join counts c     on c.site_id = ts.id
left join any_counts a on a.site_id = ts.id
where ts.status in ('candidate','rotation')
group by ts.id, ts.slug, ts.name, ts.status, ts.public_pages, a.recent_any;

-- ---------------------------------------------------------------------
-- Owner/service-role only. No anon or authenticated access: the PWA never
-- reads these. Writes come from the scheduled tasks over the connector.
-- ---------------------------------------------------------------------
alter table public.tournament_formats        enable row level security;
alter table public.tournament_sites          enable row level security;
alter table public.tournaments               enable row level security;
alter table public.tournament_payout_tiers   enable row level security;
alter table public.tournament_games          enable row level security;
alter table public.tournament_eligible_games enable row level security;
alter table public.tournament_snapshots      enable row level security;
alter table public.tournament_entries        enable row level security;
alter table public.tournament_settings       enable row level security;

revoke all on public.tournament_formats, public.tournament_sites, public.tournaments,
              public.tournament_payout_tiers, public.tournament_games, public.tournament_eligible_games,
              public.tournament_snapshots, public.tournament_entries, public.tournament_settings
  from anon, authenticated;
revoke all on public.tournament_tier_math, public.tournament_board, public.tournament_site_profile,
              public.tournament_repeat_winners, public.tournament_graduation_candidates
  from anon, authenticated;

comment on table public.tournament_sites is
  'Tournament desk: casinos that run (or may run) leaderboard tournaments. candidate -> rotation (daily sweep) -> dedicated (tournament desk task).';
comment on table public.tournaments is
  'Tournament desk: one row per event instance, keyed (site, slug, ends_at). decision holds the latest decision card.';
comment on table public.tournament_snapshots is
  'Tournament desk: leaderboard thresholds and winners lists observed over time.';
comment on table public.tournament_entries is
  'Tournament desk: the owner''s own entries and results.';

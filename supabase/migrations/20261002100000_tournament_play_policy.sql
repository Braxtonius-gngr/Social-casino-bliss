-- Tournament desk, part 2 (2026-10-02): the owner's default play policy,
-- per-site scheduling and capture rules, the max-multiplier field-size line,
-- the leaderboard threshold curve, and the list of data the desk is still
-- missing. Re-runnable. Same access model as part 1: RLS on, no browser
-- grants; only the scheduled tasks (service role, over the connector) write.

-- ---------------------------------------------------------------------
-- Sites.
--   own_task           name of the site's own daily scheduled task. Graduated
--                      sites get one; the general desk then leaves them alone.
--   rotation_priority  order in which the desk checks confirmed sites (1 first).
-- public_pages = false marks an in-app-only site: its events and leaderboards
-- come from the owner's screenshots, and the desk only rechecks it for a
-- public promo page every in_app_recheck_days.
-- ---------------------------------------------------------------------
alter table public.tournament_sites add column if not exists own_task text;
alter table public.tournament_sites add column if not exists rotation_priority integer;

comment on column public.tournament_sites.own_task is
  'Name of the scheduled task that reads this site daily. Null = the general tournament desk covers it.';
comment on column public.tournament_sites.rotation_priority is
  'Desk check order for confirmed sites, 1 first. Null = after the numbered ones.';

-- ---------------------------------------------------------------------
-- Owner-measured game facts. Each reading is kept; a trigger copies it onto
-- tournament_games (latest min bet / RTP / paylines, median pace), so cards
-- and views read one place while the raw readings stay for later checks.
--   min_bet   smallest SC-mode bet, in the site's sweeps unit
--   rtp       the in-game paytable's RTP, percent
--   paylines  fixed line count (decides whether a target like 9.1x can land)
--   pace      spins per hour at that bet, from a timed run
-- ---------------------------------------------------------------------
alter table public.tournament_games add column if not exists paylines integer check (paylines > 0);

create table if not exists public.tournament_game_observations (
  id           bigint generated always as identity primary key,
  game_id      bigint      not null references public.tournament_games (id) on delete cascade,
  kind         text        not null check (kind in ('min_bet','rtp','paylines','pace')),
  value        numeric     not null check (value > 0),
  observed_at  timestamptz not null default now(),
  source       text        not null default 'owner' check (source in ('owner','screenshot','desk')),
  note         text
);
create index if not exists tournament_game_observations_game_kind
  on public.tournament_game_observations (game_id, kind, observed_at desc);

create or replace function public.tournament_apply_game_observation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind = 'min_bet' then
    update public.tournament_games set min_bet_sweeps = new.value where id = new.game_id;
  elsif new.kind = 'rtp' then
    update public.tournament_games set rtp_onsite = new.value where id = new.game_id;
  elsif new.kind = 'paylines' then
    update public.tournament_games set paylines = new.value::integer where id = new.game_id;
  elsif new.kind = 'pace' then
    update public.tournament_games g
       set spins_per_hour = (
             select round(percentile_cont(0.5) within group (order by o.value)::numeric, 0)
             from public.tournament_game_observations o
             where o.game_id = new.game_id and o.kind = 'pace')
     where g.id = new.game_id;
  end if;
  return new;
end;
$$;

create or replace trigger tournament_game_observations_apply
  after insert on public.tournament_game_observations
  for each row execute function public.tournament_apply_game_observation();

alter table public.tournament_game_observations enable row level security;
revoke all on public.tournament_game_observations from anon, authenticated;
comment on table public.tournament_game_observations is
  'Tournament desk: the owner''s in-game readings (min bet, RTP, paylines, pace). A trigger copies them onto tournament_games.';

-- ---------------------------------------------------------------------
-- tournament_eligible_games.site_id (part 1) is checked by composite keys
-- against both the event and the game. Fill it from the event when an
-- insert leaves it out, so a desk run that writes (tournament_id, game_id)
-- still works; a game from another site is still refused by the keys.
-- ---------------------------------------------------------------------
create or replace function public.tournament_eligible_games_fill_site()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.site_id is null then
    select t.site_id into new.site_id from public.tournaments t where t.id = new.tournament_id;
  end if;
  return new;
end;
$$;

create or replace trigger tournament_eligible_games_fill_site
  before insert on public.tournament_eligible_games
  for each row execute function public.tournament_eligible_games_fill_site();

-- ---------------------------------------------------------------------
-- Settings. play_policy is the owner's standing rule set; decision cards
-- follow it. Change it with a command, not by re-running this file (rows
-- that already exist are left alone).
-- ---------------------------------------------------------------------
insert into public.tournament_settings (key, value, note) values
  ('play_policy', $j${
    "set_on": "2026-10-02",
    "summary": "Free entries always. Planned SC rides free in whatever SC event is live. Hit the Multiplier early and capped. Volume races only for the cheapest rank whose observed threshold is under its line. Max Multiplier incidental unless the field is small.",
    "rules": {
      "raffle": {
        "verdict": "free_entry_only",
        "rule": "Always take the free GC entry. Take the SC ticket only with SC spins that were already planned."
      },
      "any_sc_event": {
        "verdict": "incidental",
        "rule": "Route already-planned SC (daily bonus and its playthrough) into whichever SC event is live, in its eligible games, so its prize equity rides free."
      },
      "target_multiplier": {
        "verdict": "play_to_place",
        "rule": "Play early (in the first hours after the start) and capped.",
        "early_window_hours": 3,
        "cap_spins": 200,
        "bet": "minimum SC bet",
        "late_rule": "Later in the event, check the in-app board first. If first_n rows already show the target, only the closest places are left: treat it as incidental."
      },
      "volume_wager": {
        "verdict_if_under_line": "play_to_place",
        "otherwise": "incidental",
        "rule": "Contest only the cheapest paid rank, and only when its last-paid threshold, projected to the end, sits below that rank's break-even wager line at the default edge."
      },
      "spin_count": {
        "verdict_if_under_line": "play_to_place",
        "otherwise": "incidental",
        "rule": "Same as volume_wager, measured in spins at the game's minimum SC bet."
      },
      "max_multiplier": {
        "verdict": "incidental",
        "verdict_if_small_field": "play_to_place",
        "field_spins_max_default": 75000,
        "rule": "Incidental unless the field's total spins look under the event's breakeven_field_spins: pool x (1-e) / (e x bet), about 72,000-75,000 for a 300 SC pool at 0.10 SC and a 4% edge.",
        "field_estimate": "Lower bound from the latest Max Spins board on the same site: sum of the paid places' spin counts, scaled to this event's hours. If even that bound is over the line, stay incidental with medium confidence; with no board, incidental with low confidence."
      }
    },
    "evidence_rule": "Until a site has the three missing datasets (in-game min SC bet and RTP per game, last-paid thresholds by hours-to-end, measured spins per hour), every EV figure on its cards is a template: label it so and keep the verdict on the safe side.",
    "collect_first": [
      "min_bet_sweeps and rtp_onsite for each game the cards name, then each eligible game",
      "threshold_last_paid with hours_to_end, from leaderboard screenshots at several points in each ranked event",
      "spins_per_hour for each game the cards name"
    ]
  }$j$::jsonb, 'Owner''s default play policy (2026-10-02). Decision cards follow it.'),
  ('rotation_recheck_days', '2'::jsonb,  'Days between desk checks of a confirmed rotation site with public pages.'),
  ('in_app_recheck_days',   '14'::jsonb, 'Days between checks of an in-app-only site (public_pages = false) for a public promo page.'),
  ('planned_daily_sc',      'null'::jsonb, 'SC the owner already plays each day (daily bonus and its playthrough). Cards route it into the live SC event. Null = unknown.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Per-event lines for the formats that are not a volume race (those use
-- tournament_tier_math, per paid rank). One row per open or recent event.
--   breakeven_field_spins  N* = pool x (1-e) / (e x bet). In a top-N
--     multiplier race your share of the pool is about S / N for S spins of
--     your own against N field spins, so S spins pay while N < N*. About
--     72,000 for a 300 SC pool at 0.10 SC and 4%; the policy rounds to 75,000.
--   raffle_sc_ticket_breakeven_tickets  pool / (sc_spins x bet x e): the SC
--     ticket pays while fewer tickets than this are entered.
--   capped_session_cost  cap_spins x bet x e for the capped Hit the
--     Multiplier session the policy allows.
-- bet = format_params.min_bet (site unit) when stated, else the lowest
-- owner-measured min bet among the eligible games, else reference_min_bet;
-- converted to USD. A nonpositive bet leaves the lines NULL, as in
-- tournament_tier_math.
-- ---------------------------------------------------------------------
create or replace view public.tournament_event_math
with (security_invoker = true) as
with s as (
  select
    coalesce((select (value #>> '{}')::numeric from public.tournament_settings where key = 'default_edge'), 0.04)      as e1,
    coalesce((select (value #>> '{}')::numeric from public.tournament_settings where key = 'pessimistic_edge'), 0.06)  as e2,
    coalesce((select (value #>> '{}')::numeric from public.tournament_settings where key = 'reference_min_bet'), 0.10) as ref_bet,
    coalesce((select (value #>> '{rules,target_multiplier,cap_spins}')::numeric
                from public.tournament_settings where key = 'play_policy'), 200)                                      as cap_spins
),
ev as (
  select
    t.id, ts.slug as site, t.name, t.format_code, t.status, t.ends_at, t.format_params,
    t.total_prize_sweeps / ts.units_per_usd as pool_usd,
    coalesce((t.format_params ->> 'min_bet')::numeric,
             (select min(g.min_bet_sweeps)
                from public.tournament_eligible_games eg
                join public.tournament_games g on g.id = eg.game_id
               where eg.tournament_id = t.id)) / ts.units_per_usd as stated_or_measured_bet,
    (select count(*) from public.tournament_eligible_games eg where eg.tournament_id = t.id) as eligible_games,
    (select count(*) from public.tournament_eligible_games eg
       join public.tournament_games g on g.id = eg.game_id
      where eg.tournament_id = t.id and g.min_bet_sweeps is not null and g.rtp_onsite is not null) as games_with_facts
  from public.tournaments t
  join public.tournament_sites ts on ts.id = t.site_id
  where t.status in ('upcoming','live') or t.ends_at > now() - interval '2 days'
)
select
  ev.id                                         as tournament_id,
  ev.site, ev.name, ev.format_code, ev.status, ev.ends_at,
  round(ev.pool_usd, 2)                         as pool_usd,
  round(b.bet, 4)                               as bet_used,
  ev.stated_or_measured_bet is null             as bet_is_reference,
  case when ev.format_code = 'max_multiplier' then
    round(ev.pool_usd * (1 - s.e1) / (s.e1 * b.pos_bet), 0) end as breakeven_field_spins,
  case when ev.format_code = 'max_multiplier' then
    round(ev.pool_usd * (1 - s.e2) / (s.e2 * b.pos_bet), 0) end as breakeven_field_spins_pessimistic,
  case when ev.format_code = 'raffle' and ev.format_params ? 'sc_spins' then
    round(ev.pool_usd / ((ev.format_params ->> 'sc_spins')::numeric * b.pos_bet * s.e1), 0) end as raffle_sc_ticket_breakeven_tickets,
  case when ev.format_code = 'target_multiplier' then
    round(s.cap_spins * b.bet * s.e1, 2) end    as capped_session_cost,
  ev.eligible_games,
  ev.games_with_facts
from ev
cross join s
cross join lateral (
  select coalesce(ev.stated_or_measured_bet, s.ref_bet) as bet,
         case when coalesce(ev.stated_or_measured_bet, s.ref_bet) > 0
              then coalesce(ev.stated_or_measured_bet, s.ref_bet) end as pos_bet
) b;

-- ---------------------------------------------------------------------
-- Leaderboard threshold curve: how the last-paid score grows toward the end.
-- One row per site, format and hours-to-end bucket. median_growth_to_end is
-- final / observed for events that also have a reading within 30 minutes of
-- the end; the desk multiplies a live reading by it to project the final
-- threshold. Empty until the owner's leaderboard screenshots come in.
-- ---------------------------------------------------------------------
create or replace view public.tournament_threshold_curve
with (security_invoker = true) as
with obs as (
  select
    ts.slug                 as site,
    t.format_code,
    t.id                    as tournament_id,
    sn.observed_at,
    sn.hours_to_end,
    sn.threshold_last_paid,
    case when sn.hours_to_end <= 2  then '0-2h'
         when sn.hours_to_end <= 12 then '2-12h'
         when sn.hours_to_end <= 24 then '12-24h'
         else '24h+' end    as bucket
  from public.tournament_snapshots sn
  join public.tournaments t       on t.id = sn.tournament_id
  join public.tournament_sites ts on ts.id = t.site_id
  where sn.threshold_last_paid is not null
    and sn.hours_to_end is not null
),
fin as (
  select distinct on (tournament_id) tournament_id, threshold_last_paid as final_threshold
  from obs
  where hours_to_end <= 0.5
  order by tournament_id, observed_at desc
)
select
  o.site,
  o.format_code,
  o.bucket,
  count(*)                                                    as observations,
  count(distinct o.tournament_id)                             as events,
  percentile_cont(0.5) within group (order by o.threshold_last_paid) as median_threshold,
  percentile_cont(0.5) within group (order by f.final_threshold / nullif(o.threshold_last_paid, 0))
    filter (where f.final_threshold is not null)              as median_growth_to_end,
  count(f.final_threshold)                                    as readings_with_final,
  max(o.observed_at)                                          as last_observed
from obs o
left join fin f on f.tournament_id = o.tournament_id
group by o.site, o.format_code, o.bucket;

-- ---------------------------------------------------------------------
-- What the desk is still missing, most urgent first (priority 1 first, then
-- needed_by). Three kinds, matching play_policy.collect_first:
--   game_facts  in-game min SC bet / RTP for games an open event allows, or
--               games in a lobby tab the site's events used in the last 35 days
--   threshold   a live ranked event with no leaderboard reading in 12 hours
--   pace        spins per hour for games a decision card names
-- Only the owner can fill these (they sit behind a login): the brief lists
-- the top few each morning with the command to paste.
-- ---------------------------------------------------------------------
create or replace view public.tournament_data_gaps
with (security_invoker = true) as
with open_ev as (
  select t.*, ts.slug as site
  from public.tournaments t
  join public.tournament_sites ts on ts.id = t.site_id
  where t.status in ('upcoming','live')
    and t.ends_at > now()
),
named as (
  select e.id as tournament_id, e.site_id, g ->> 'name' as game_name
  from open_ev e
  cross join lateral jsonb_array_elements(coalesce(e.decision -> 'games', '[]'::jsonb)) as g
),
eligible_open as (
  select eg.game_id, min(e.ends_at) as needed_by,
         bool_or(e.format_code = 'target_multiplier') as in_target_event
  from public.tournament_eligible_games eg
  join open_ev e on e.id = eg.tournament_id
  group by eg.game_id
),
recent_tabs as (
  select distinct t.site_id, substr(t.game_scope, 10) as tab
  from public.tournaments t
  where t.game_scope like 'category:%'
    and t.ends_at > now() - interval '35 days'
)
select
  ts.slug                                              as site,
  'game_facts'::text                                   as kind,
  g.name                                               as item,
  concat_ws(' + ',
    case when g.min_bet_sweeps is null then 'min SC bet' end,
    case when g.rtp_onsite     is null then 'in-game RTP' end,
    case when g.paylines is null and eo.in_target_event then 'paylines' end) as missing,
  case when exists (select 1 from named n where n.site_id = g.site_id and n.game_name = g.name) then 1
       when eo.game_id is not null then 2
       else 3 end                                      as priority,
  eo.needed_by,
  'In SC mode, open the game''s info/paytable and note the smallest SC bet and the RTP line'
    || case when eo.in_target_event then ' and the number of paylines' else '' end
    || '. Log: Tournament game facts ' || ts.slug || ' ' || g.name || ': min <sc>, rtp <percent>'
    || case when eo.in_target_event then ', lines <n>' else '' end  as how
from public.tournament_games g
join public.tournament_sites ts on ts.id = g.site_id
left join eligible_open eo      on eo.game_id = g.id
where (g.min_bet_sweeps is null or g.rtp_onsite is null or (g.paylines is null and eo.in_target_event))
  and (eo.game_id is not null
       or exists (select 1 from recent_tabs r where r.site_id = g.site_id and r.tab = any (g.categories)))
union all
-- A ranked event wants a reading at least every 12 hours, plus one in its
-- last 3 hours: that final point is what the threshold curve projects to.
select
  e.site,
  'threshold',
  e.name || ' (ends ' || to_char(e.ends_at at time zone 'America/Chicago', 'Dy HH12:MI AM') || ' CT)',
  case when e.ends_at <= now() + interval '3 hours' then 'near-final last-paid score (last 3 hours)'
       else 'last-paid score with hours to end' end,
  1,
  case when e.ends_at <= now() + interval '3 hours' then e.ends_at - interval '30 minutes' else e.ends_at end,
  'Screenshot the in-app leaderboard down to the last paid place and paste it with: Tournament leaderboard '
    || e.site || ' ' || e.slug
from open_ev e
where e.status = 'live'
  and e.format_code in ('volume_wager','spin_count','max_multiplier','target_multiplier','max_win','sum_multipliers','total_win')
  and (
    not exists (
      select 1 from public.tournament_snapshots sn
      where sn.tournament_id = e.id
        and (sn.threshold_last_paid is not null or sn.leaderboard is not null)
        and sn.observed_at > now() - interval '12 hours')
    or (e.ends_at <= now() + interval '3 hours'
        and not exists (
          select 1 from public.tournament_snapshots sn
          where sn.tournament_id = e.id
            and (sn.threshold_last_paid is not null or sn.leaderboard is not null)
            and sn.hours_to_end <= 3)))
union all
select
  ts.slug,
  'pace',
  g.name,
  'spins per hour',
  2,
  min(e.ends_at),
  'Time a run of spins at the minimum bet and log: Tournament pace ' || ts.slug || ' ' || g.name
    || ': <spins> spins in <minutes> min'
from named n
join open_ev e                  on e.id = n.tournament_id
join public.tournament_games g  on g.site_id = n.site_id and g.name = n.game_name
join public.tournament_sites ts on ts.id = g.site_id
where g.spins_per_hour is null
group by ts.slug, g.name;

revoke all on public.tournament_event_math, public.tournament_threshold_curve, public.tournament_data_gaps
  from anon, authenticated;

comment on view public.tournament_data_gaps is
  'Tournament desk: in-game facts, leaderboard readings and pace the desk still needs, most urgent first. Only the owner can fill them.';
comment on view public.tournament_event_math is
  'Tournament desk: per-event lines for non-volume formats (max-multiplier field size, raffle SC ticket, capped Hit the Multiplier cost).';
comment on view public.tournament_threshold_curve is
  'Tournament desk: last-paid leaderboard thresholds by site, format and hours-to-end, with median growth to the final.';

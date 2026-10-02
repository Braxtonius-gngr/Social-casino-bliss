-- Tournament desk, part 3 (2026-10-02): the game facts check.
--
-- A daily scheduled task ("Tournament game facts check", 8:20 AM CT) opens
-- games in the owner's own Chrome and reads what the game itself shows: min SC
-- bet, RTP, lines or ways, volatility, max win, hit frequency. It never spins.
-- This part lets the observation log say how each reading was taken, keeps
-- provider and operator-page numbers out of the site's facts, and gives the
-- 8:44 brief its flags through tournament_data_gaps: changed RTPs, games that
-- show no RTP, and sites that need the owner signed in.
--
-- Two steps, both re-runnable:
--   PART A (two statements) in the Supabase SQL editor: the connector refuses
--     them, because they remove the old NOT NULL and the old kind check.
--   PART B (the rest) through the connector or the SQL editor. It stops with
--     an error if part A hasn't run.

-- =====================================================================
-- PART A: SQL editor only.
-- =====================================================================
alter table public.tournament_game_observations alter column value drop not null;
alter table public.tournament_game_observations drop constraint if exists tournament_game_observations_kind_check;

-- =====================================================================
-- PART B: connector-safe from here on.
-- =====================================================================
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'tournament_game_observations'
                and column_name = 'value' and is_nullable = 'NO') then
    raise exception 'Tournament desk part 3: run part A (two statements) in the SQL editor first.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Observation log: one reading per row, now with its provenance.
--   value_text        the value exactly as printed ("96.50%", "4/5", "ways",
--                     "5,000x", "1 in 3.2"). The source of truth for display.
--   value             the number, only when the printed form is one: RTP in
--                     percent, min bet in the site's sweeps unit, lines,
--                     max win as an x multiple, hit frequency as a percent.
--                     Never converted from another form, so it can be null.
--   volatility_scale  the scale the game shows, as shown ("1-5", "Low/Med/High",
--                     "5 bolts"); the label goes in value_text.
--   coin_mode         SC or GC: the mode the game was in when read.
--   source_tier       in_game          read inside the game, launched on this
--                                      site, by the check
--                     owner_screenshot the owner's screenshot or own in-game
--                                      reading (the chat command)
--                     provider         the studio's page: context only
--                     operator_page    the casino's RTP page: pending until an
--                                      in-game reading confirms it
--                     Only in_game and owner_screenshot feed tournament_games.
--   evidence          {"screen": "paytable p.3", "where": "footer under the
--                     lines diagram", "text": "<the line as printed>",
--                     "screenshot": "<id or file>", "read_twice": true,
--                     "url": "<where the game was launched>"}; for
--                     rtp_not_shown, {"screens_opened": ["info","paytable","rules"]}.
-- New kinds: rtp_not_shown (the game's screens show no RTP), volatility,
-- max_win, hit_freq. Lines read as ways: kind 'paylines', value null,
-- value_text 'ways'.
-- ---------------------------------------------------------------------
alter table public.tournament_game_observations
  add column if not exists value_text       text,
  add column if not exists volatility_scale text,
  add column if not exists coin_mode        text,
  add column if not exists source_tier      text,
  add column if not exists evidence         jsonb;

-- Readings logged before this part came from the owner's command. A 'desk'
-- reading from before it was never read in-game, so it lands on the safe side.
update public.tournament_game_observations
   set source_tier = case when source = 'desk' then 'provider' else 'owner_screenshot' end
 where source_tier is null;
alter table public.tournament_game_observations alter column source_tier set not null;

-- New checks, added once (re-running leaves them as they are).
do $$
declare
  c record;
begin
  for c in
    select * from (values
      ('tournament_game_observations_kind_check',
       $c$check (kind in ('min_bet','rtp','rtp_not_shown','paylines','volatility','max_win','hit_freq','pace'))$c$),
      ('tournament_game_observations_tier_check',
       $c$check (source_tier in ('in_game','owner_screenshot','provider','operator_page'))$c$),
      ('tournament_game_observations_coin_mode_check',
       $c$check (coin_mode in ('SC','GC'))$c$),
      -- What each kind must carry. A min bet is an SC-mode bet by definition.
      ('tournament_game_observations_shape',
       $c$check (
          case kind
            when 'min_bet'       then value is not null and coin_mode is distinct from 'GC'
            when 'rtp'           then value is not null and value between 50 and 100
            when 'pace'          then value is not null
            when 'paylines'      then (value is not null and value_text is distinct from 'ways')
                                   or (value is null and value_text = 'ways')
            when 'volatility'    then value is null and value_text is not null
            when 'max_win'       then value_text is not null
            when 'hit_freq'      then value_text is not null
            when 'rtp_not_shown' then value is null
                                  and source_tier in ('in_game','owner_screenshot')
                                  and jsonb_typeof(evidence -> 'screens_opened') = 'array'
            else false
          end)$c$),
      -- A reading the check took itself has to say what it saw and where.
      ('tournament_game_observations_in_game_evidence',
       $c$check (
          source_tier <> 'in_game'
          or (coin_mode is not null
              and jsonb_typeof(evidence) = 'object'
              and (kind = 'rtp_not_shown'
                   or (value_text is not null and evidence ? 'screen' and evidence ? 'where'))))$c$)
    ) as v(name, def)
  loop
    if not exists (select 1 from pg_constraint
                    where conname = c.name
                      and conrelid = 'public.tournament_game_observations'::regclass) then
      execute format('alter table public.tournament_game_observations add constraint %I %s', c.name, c.def);
    end if;
  end loop;
end;
$$;

comment on table public.tournament_game_observations is
  'Tournament desk: in-game readings (min bet, RTP or none shown, lines, volatility, max win, hit frequency, pace), each with its source tier and evidence. A trigger keeps tournament_games in step from the in_game and owner_screenshot readings only: latest reading by time, median pace.';

-- ---------------------------------------------------------------------
-- The site's facts on tournament_games, kept by the trigger. The older
-- volatility, max_win_x and hit_freq columns stay as researched/provider
-- context; these hold what the game showed on this site.
-- ---------------------------------------------------------------------
alter table public.tournament_games
  add column if not exists line_mode        text check (line_mode in ('lines','ways')),
  add column if not exists volatility_label text,
  add column if not exists volatility_scale text,
  add column if not exists max_win_onsite   text,
  add column if not exists max_win_x_onsite numeric,
  add column if not exists hit_freq_onsite  text,
  add column if not exists rtp_not_shown_at timestamptz,
  add column if not exists facts_read_at    timestamptz;

comment on column public.tournament_games.rtp_not_shown_at is
  'Set when the latest in-game RTP reading found none on the info, paytable and rules screens. rtp_onsite is then null.';
comment on column public.tournament_games.facts_read_at is
  'Latest in_game or owner_screenshot reading of any game fact (not pace).';

create or replace function public.tournament_apply_game_observation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  g  bigint[] := '{}';
  k  text[]   := '{}';
  i  integer;
  vk text;
  vv numeric;
  vt text;
  vs text;
  va timestamptz;
begin
  if tg_op <> 'DELETE' then g := g || new.game_id; k := k || new.kind; end if;
  if tg_op <> 'INSERT' then g := g || old.game_id; k := k || old.kind; end if;
  for i in 1 .. coalesce(array_length(g, 1), 0) loop
    vk := null; vv := null; vt := null; vs := null; va := null;
    if k[i] = 'pace' then
      select round(percentile_cont(0.5) within group (order by o.value)::numeric, 0) into vv
        from public.tournament_game_observations o
       where o.game_id = g[i] and o.kind = 'pace'
         and o.source_tier in ('in_game','owner_screenshot');
      update public.tournament_games set spins_per_hour = vv where id = g[i];
    else
      -- RTP and "no RTP shown" are one fact: the latest of the two wins.
      select o.kind, o.value, o.value_text, o.volatility_scale, o.observed_at
        into vk, vv, vt, vs, va
        from public.tournament_game_observations o
       where o.game_id = g[i]
         and o.source_tier in ('in_game','owner_screenshot')
         and (o.kind = k[i] or (k[i] in ('rtp','rtp_not_shown') and o.kind in ('rtp','rtp_not_shown')))
       order by o.observed_at desc, o.id desc
       limit 1;
      if k[i] = 'min_bet' then
        update public.tournament_games set min_bet_sweeps = vv where id = g[i];
      elsif k[i] in ('rtp','rtp_not_shown') then
        update public.tournament_games
           set rtp_onsite       = case when vk = 'rtp' then vv end,
               rtp_not_shown_at = case when vk = 'rtp_not_shown' then va end
         where id = g[i];
      elsif k[i] = 'paylines' then
        update public.tournament_games
           set paylines  = vv::integer,
               line_mode = case when vt = 'ways' then 'ways' when vv is not null then 'lines' end
         where id = g[i];
      elsif k[i] = 'volatility' then
        update public.tournament_games
           set volatility_label = vt, volatility_scale = vs
         where id = g[i];
      elsif k[i] = 'max_win' then
        update public.tournament_games
           set max_win_onsite = vt, max_win_x_onsite = vv
         where id = g[i];
      elsif k[i] = 'hit_freq' then
        update public.tournament_games set hit_freq_onsite = vt where id = g[i];
      end if;
      update public.tournament_games t
         set facts_read_at = (select max(o.observed_at)
                                from public.tournament_game_observations o
                               where o.game_id = g[i] and o.kind <> 'pace'
                                 and o.source_tier in ('in_game','owner_screenshot'))
       where t.id = g[i];
    end if;
  end loop;
  return null;
end;
$$;

revoke all on function public.tournament_apply_game_observation() from public;

-- ---------------------------------------------------------------------
-- One row per run of the game facts check, written at the end of the run.
--   chrome_ok      false when Chrome couldn't be reached (nothing was read)
--   sites_skipped  [{"site": "<slug>", "reason": "needs_signin" | "blocked"
--                    | "time_cap" | "error", "note": "..."}]
-- ---------------------------------------------------------------------
create table if not exists public.tournament_fact_runs (
  id             bigint generated always as identity primary key,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  chrome_ok      boolean     not null,
  games_read     integer     not null default 0 check (games_read >= 0),
  sites_skipped  jsonb       not null default '[]'::jsonb check (jsonb_typeof(sites_skipped) = 'array'),
  summary        text
);
alter table public.tournament_fact_runs enable row level security;
revoke all on public.tournament_fact_runs from anon, authenticated;
comment on table public.tournament_fact_runs is
  'Tournament desk: one row per run of the game facts check (8:20 AM CT): whether Chrome was reachable, games read, sites skipped and why.';

-- ---------------------------------------------------------------------
-- What the desk is still missing (part 2), plus the game facts check's flags.
-- Changes from part 2:
--   * lines are known once the game states lines or ways;
--   * a game whose screens show no RTP says so, and when that is all that is
--     missing it moves to priority 3 (nothing to collect in-game);
--   * priority 0 flags from the last 26 hours: a changed RTP, games showing
--     no RTP, sites that need the owner signed in, and a check that didn't
--     run or couldn't reach Chrome. The brief's Collect section shows them.
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
),
facts as (
  select g.*, ts.slug as site, eo.game_id as open_game_id, eo.needed_by, eo.in_target_event,
         g.paylines is null and g.line_mode is null and coalesce(eo.in_target_event, false) as lines_missing
  from public.tournament_games g
  join public.tournament_sites ts on ts.id = g.site_id
  left join eligible_open eo on eo.game_id = g.id
),
next_check as (
  select case when n.today_check > now() then n.today_check
              else ((n.d + 1) + time '08:20') at time zone 'America/Chicago' end as next_at
  from (select (now() at time zone 'America/Chicago')::date as d,
               (((now() at time zone 'America/Chicago')::date) + time '08:20') at time zone 'America/Chicago' as today_check) n
),
last_run as (
  select r.* from public.tournament_fact_runs r order by r.started_at desc limit 1
),
rtp_prev as (
  -- the latest RTP-or-none reading per game, with the last RTP number read before it
  select l.game_id, l.kind, l.value, l.observed_at,
         (select p.value from public.tournament_game_observations p
           where p.game_id = l.game_id and p.kind = 'rtp'
             and p.source_tier in ('in_game','owner_screenshot')
             and (p.observed_at, p.id) < (l.observed_at, l.id)
           order by p.observed_at desc, p.id desc limit 1) as prev_rtp
  from (select o.*, row_number() over (partition by o.game_id order by o.observed_at desc, o.id desc) as rn
          from public.tournament_game_observations o
         where o.kind in ('rtp','rtp_not_shown')
           and o.source_tier in ('in_game','owner_screenshot')) l
  where l.rn = 1
    and l.observed_at > now() - interval '26 hours'
)
select
  f.site,
  'game_facts'::text                                   as kind,
  f.name                                               as item,
  concat_ws(' + ',
    case when f.min_bet_sweeps is null then 'min SC bet' end,
    case when f.rtp_onsite is null and f.rtp_not_shown_at is null then 'in-game RTP'
         when f.rtp_onsite is null then 'in-game RTP (none shown in game, checked '
              || to_char(f.rtp_not_shown_at at time zone 'America/Chicago', 'Mon DD') || ')' end,
    case when f.lines_missing then 'paylines' end)     as missing,
  case when f.min_bet_sweeps is not null and not f.lines_missing
            and f.rtp_onsite is null and f.rtp_not_shown_at is not null then 3
       when exists (select 1 from named n where n.site_id = f.site_id and n.game_name = f.name) then 1
       when f.open_game_id is not null then 2
       else 3 end                                      as priority,
  f.needed_by,
  'In SC mode, open the game''s info/paytable and note the smallest SC bet and the RTP line'
    || case when f.in_target_event then ' and the number of paylines' else '' end
    || '. Log: Tournament game facts ' || f.site || ' ' || f.name || ': min <sc>, rtp <percent>'
    || case when f.in_target_event then ', lines <n>' else '' end  as how
from facts f
where (f.min_bet_sweeps is null or f.rtp_onsite is null or f.lines_missing)
  and (f.open_game_id is not null
       or exists (select 1 from recent_tabs r where r.site_id = f.site_id and r.tab = any (f.categories)))
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
group by ts.slug, g.name
union all
-- Flags from the game facts check (priority 0, for 26 hours after the reading).
select
  ts.slug,
  'rtp_changed',
  g.name || ': RTP ' || rp.prev_rtp::text || '% → ' || rp.value::text || '%',
  'confirm the site''s new RTP version',
  0,
  (select next_at from next_check),
  'The game now shows a different RTP than last time; the site probably switched RTP versions. The new reading stands. To double-check, send a paytable screenshot or: Tournament game facts '
    || ts.slug || ' ' || g.name || ': rtp <percent>'
from rtp_prev rp
join public.tournament_games g  on g.id = rp.game_id
join public.tournament_sites ts on ts.id = g.site_id
where rp.kind = 'rtp' and rp.prev_rtp is not null and rp.prev_rtp <> rp.value
union all
select
  ts.slug,
  'no_rtp',
  'No RTP shown in game: ' || string_agg(g.name || coalesce(' (was ' || rp.prev_rtp::text || '%)', ''), ', ' order by g.name),
  'RTP stays blank',
  0,
  (select next_at from next_check),
  'Info, paytable and rules showed no RTP, so it stays blank (the check skips these for 30 days). If you find it inside the game, send: Tournament game facts '
    || ts.slug || ' <game>: rtp <percent>'
from rtp_prev rp
join public.tournament_games g  on g.id = rp.game_id
join public.tournament_sites ts on ts.id = g.site_id
where rp.kind = 'rtp_not_shown'
group by ts.slug
union all
select
  coalesce(ts.slug, s ->> 'site'),
  'facts_signin',
  'Game facts check: ' || coalesce(ts.name, s ->> 'site') || ' needs you signed in',
  coalesce(nullif(s ->> 'note', ''), 'signed out'),
  0,
  (select next_at from next_check),
  'Sign in to ' || coalesce(ts.name, s ->> 'site') || ' in your Chrome on the always-on laptop; the next 8:20 AM CT check picks it up.'
from last_run r
cross join lateral jsonb_array_elements(r.sites_skipped) as s
left join public.tournament_sites ts on ts.slug = s ->> 'site'
where r.started_at > now() - interval '26 hours'
  and s ->> 'reason' = 'needs_signin'
union all
select
  'all',
  'facts_run',
  case when r.started_at <= now() - interval '26 hours'
       then 'Game facts check hasn''t run since ' || to_char(r.started_at at time zone 'America/Chicago', 'Dy Mon DD HH12:MI AM') || ' CT'
       else 'Game facts check couldn''t reach Chrome (' || to_char(r.started_at at time zone 'America/Chicago', 'HH12:MI AM') || ' CT)' end,
  'nothing read',
  0,
  (select next_at from next_check),
  'The check needs the always-on laptop awake, the Claude app open, and Chrome running with the Claude extension. It runs again at 8:20 AM CT.'
from last_run r
where r.started_at <= now() - interval '26 hours'
   or not r.chrome_ok;

revoke all on public.tournament_data_gaps from anon, authenticated;
comment on view public.tournament_data_gaps is
  'Tournament desk: in-game facts, leaderboard readings and pace the desk still needs, most urgent first, plus the game facts check''s priority-0 flags (changed RTP, no RTP shown, needs sign-in, check not run). Only the owner can fill them.';

-- ---------------------------------------------------------------------
-- The game facts check's work list, in order:
--   1 event  games in live or upcoming events that still miss a fact
--   2 stale  games whose last in-game reading is over 30 days old
--   3 tab    games in a lobby tab recent events used, still missing a fact
-- Luck Party first, then rotation_priority, then the rest. A game whose
-- screens showed no RTP in the last 30 days is left out unless something
-- else is still missing (and its RTP isn't re-read).
-- ---------------------------------------------------------------------
create or replace view public.tournament_fact_queue
with (security_invoker = true) as
with gaps as (
  select d.site, d.item as game, d.missing, d.priority, d.needed_by
  from public.tournament_data_gaps d
  where d.kind = 'game_facts'
),
q as (
  select ts.slug as site, ts.name as site_name, ts.base_url, ts.sweeps_unit,
         g.id as game_id, g.name as game, g.provider,
         case when gp.game is not null and gp.priority < 3 then 1
              when g.facts_read_at < now() - interval '30 days' then 2
              else 3 end as stage,
         gp.missing, gp.priority, gp.needed_by,
         g.min_bet_sweeps, g.rtp_onsite, g.paylines, g.line_mode,
         g.volatility_label, g.facts_read_at, g.rtp_not_shown_at,
         g.rtp_not_shown_at > now() - interval '30 days' as skip_rtp,
         case when ts.slug = 'luckparty' then 0 else coalesce(ts.rotation_priority, 99) end as site_order
  from public.tournament_games g
  join public.tournament_sites ts on ts.id = g.site_id
  left join gaps gp on gp.site = ts.slug and gp.game = g.name
  where ts.status in ('dedicated','rotation')
    and (gp.game is not null or g.facts_read_at < now() - interval '30 days')
    and not (g.rtp_not_shown_at > now() - interval '30 days'
             and coalesce(gp.missing, '') not like '%min SC bet%'
             and coalesce(gp.missing, '') not like '%paylines%')
)
select row_number() over (order by stage, site_order, priority nulls last, needed_by nulls last, game) as queue_order,
       q.*
from q;

revoke all on public.tournament_fact_queue from anon, authenticated;
comment on view public.tournament_fact_queue is
  'Tournament desk: the game facts check''s work list, in order (event gaps, then stale readings, then lobby-tab gaps; Luck Party first, then rotation_priority).';

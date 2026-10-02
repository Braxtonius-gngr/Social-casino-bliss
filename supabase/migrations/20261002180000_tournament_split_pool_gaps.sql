-- Tournament desk, part 4: even-split events.
--
-- Some events split the pool evenly among everyone who qualifies (Stake's
-- RNG Rush: hit 265x on the week's game). They have no leaderboard, so the
-- 'threshold' gap ("last-paid score") asked for something that doesn't exist.
-- Such events carry format_params.split_pool = true. They now leave the
-- threshold gap and get a 'qualifiers' gap instead (priority 2): the number
-- of players who have qualified so far, stored in tournament_snapshots
-- .winners_count. Asked once; a screenshot showing no count settles it.
--
-- Only tournament_data_gaps changes (same columns). Connector-safe: run it
-- through execute_sql or paste it into the SQL editor.

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
  -- next_at: the next 8:20 AM CT check; prev_at: the latest one due by now.
  select case when n.today_check > now() then n.today_check
              else ((n.d + 1) + time '08:20') at time zone 'America/Chicago' end as next_at,
         case when n.today_check <= now() then n.today_check
              else ((n.d - 1) + time '08:20') at time zone 'America/Chicago' end as prev_at
  from (select (now() at time zone 'America/Chicago')::date as d,
               (((now() at time zone 'America/Chicago')::date) + time '08:20') at time zone 'America/Chicago' as today_check) n
),
last_run as (
  -- always one row; all nulls when no run has been logged yet
  select r.*
  from (select 1) one
  left join lateral (select * from public.tournament_fact_runs order by started_at desc limit 1) r on true
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
-- An even-split event (format_params.split_pool) has no ranks; see 'qualifiers'.
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
  and (e.format_params ->> 'split_pool') is distinct from 'true'
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
-- An even-split event (everyone who qualifies shares the pool) has no
-- leaderboard. What sizes a share is how many players have qualified, so ask
-- for that once. A screenshot that shows no count settles it; one that does
-- show a count is asked for again after 24 hours.
select
  e.site,
  'qualifiers',
  e.name || ' (ends ' || to_char(e.ends_at at time zone 'America/Chicago', 'Dy HH12:MI AM') || ' CT)',
  case when ls.id is null then 'how many players have qualified, if the site shows it'
       else 'qualifier count (last: ' || ls.winners_count::text || ', '
            || to_char(ls.observed_at at time zone 'America/Chicago', 'Dy HH12:MI AM') || ' CT)' end,
  2,
  e.ends_at,
  'Screenshot the event page where it shows how many players have qualified so far (if it shows no count, say so) and paste it with: Tournament leaderboard '
    || e.site || ' ' || e.slug
from open_ev e
left join lateral (
  select sn.id, sn.winners_count, sn.observed_at
  from public.tournament_snapshots sn
  where sn.tournament_id = e.id and sn.source = 'screenshot'
  order by sn.observed_at desc, sn.id desc
  limit 1) ls on true
where e.status = 'live'
  and e.format_params ->> 'split_pool' = 'true'
  and (ls.id is null
       or (ls.winners_count is not null and ls.observed_at < now() - interval '24 hours'))
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
-- A run logs its start time; 30 minutes of slack covers an early start.
select
  'all',
  'facts_run',
  case when r.id is null
       then 'Game facts check has never logged a run'
       when r.started_at < (select prev_at from next_check) - interval '30 minutes'
       then 'No game facts check logged since ' || to_char(r.started_at at time zone 'America/Chicago', 'Dy Mon DD HH12:MI AM') || ' CT'
       else 'Game facts check couldn''t reach Chrome (' || to_char(r.started_at at time zone 'America/Chicago', 'HH12:MI AM') || ' CT)' end,
  'nothing read',
  0,
  (select next_at from next_check),
  'The check needs the always-on laptop awake, the Claude app open, and Chrome running with the Claude extension. It runs again at 8:20 AM CT.'
from last_run r
where r.id is null
   or r.started_at < (select prev_at from next_check) - interval '30 minutes'
   or not r.chrome_ok;

revoke all on public.tournament_data_gaps from anon, authenticated;
comment on view public.tournament_data_gaps is
  'Tournament desk: in-game facts, leaderboard readings (qualifier counts for even-split events) and pace the desk still needs, most urgent first, plus the game facts check''s priority-0 flags (changed RTP, no RTP shown, needs sign-in, check not run). Only the owner can fill them.';

-- Tournament desk, part 5 (2026-10-02): what the owner's research report added
-- on top of parts 1-4.
--
--   * Bankroll sizing: tournament_session_bankroll() sizes a session at
--     expected loss + 3 SD, and tournament_bankroll_status shows the room left
--     under weekly_loss_limit this week.
--   * Late-surge buffer: tournament_threshold_projection projects each live
--     ranked event's last-paid threshold to its end (learned growth once the
--     curve has finished events behind it, else straight-line pace x 1.3) and
--     compares it with the cheapest paid rank's break-even line.
--   * Game picks: tournament_game_picks ranks each open event's eligible games
--     the way its format wants, from the site's own in-game facts.
--   * Questions only support can answer: tournament_owner_questions, shown in
--     tournament_data_gaps (kind 'question'). First one: what "closest" means
--     in Luck Party's Hit the Multiplier.
--   * Three new candidate sites (High 5, MyPrize, Sweep Shark) and a note that a
--     US sweeps "Drops & Wins" is operator-run.
--   * play_policy gains the rules that point the desks at all of the above
--     (added once; an owner's later edit is left alone).
--
-- Re-runnable and connector-safe (create or replace / if not exists / on
-- conflict). Same access model as parts 1-4: RLS on, no browser grants.

-- ---------------------------------------------------------------------
-- Settings. Assumptions, not measurements: the owner changes them here.
--   bankroll_rule         sd_multiple: SDs of bankroll on top of the expected
--                         loss. sigma_by_band: per-spin SD in bets, by
--                         volatility band, at the top of the usual ranges
--                         (low/medium 3-6, high 10-20+); unknown = high.
--   threshold_projection  late_surge_buffer: added to a straight-line
--                         projection, since volume races surge at the end
--                         (usual range 0.20-0.40). min_finals_to_learn:
--                         finished events a curve bucket needs before its
--                         learned growth replaces the buffer.
-- ---------------------------------------------------------------------
insert into public.tournament_settings (key, value, note) values
  ('bankroll_rule',
   '{"sd_multiple": 3, "sigma_by_band": {"low": 4, "mid": 6, "high": 20, "unknown": 20}}'::jsonb,
   'Session bankroll = expected loss + sd_multiple x SD, SD = sqrt(spins) x bet x sigma. Sigma is the per-spin SD in bets, assumed per volatility band (top of the usual ranges: low/medium 3-6, high 10-20+), not measured.'),
  ('threshold_projection',
   '{"late_surge_buffer": 0.30, "buffer_range": [0.20, 0.40], "min_finals_to_learn": 3}'::jsonb,
   'Projecting a live last-paid threshold (tournament_threshold_projection): the learned growth (final / reading for the same site, format and hours-to-end bucket) once min_finals_to_learn finished events are behind it, else straight-line pace to the end x (1 + late_surge_buffer).')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Volatility band from what the game itself shows: 'low' | 'mid' | 'high',
-- or NULL when the label can't be read. Words ("Low", "Very Low", "Med-High",
-- "Very High") or a number on the game's own scale ("4/5", or "4" with scale
-- "1-5" / "5 bolts"): up to 40% of the scale is low, up to 70% mid, above
-- that high. Bands, not finer: scales differ between studios.
-- ---------------------------------------------------------------------
create or replace function public.tournament_volatility_band(p_label text, p_scale text default null)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  l text := lower(btrim(coalesce(p_label, '')));
  s text := lower(btrim(coalesce(p_scale, '')));
  n numeric;
  m numeric;
  r numeric;
begin
  if l = '' then
    return null;
  end if;
  if l ~ 'low' and l !~ '(high|med|mid)' then return 'low'; end if;
  if l ~ '(very|extreme|insane|ultra)' then return 'high'; end if;
  if l ~ '(med|mid)' and l ~ 'high' then return 'mid'; end if;
  if l ~ 'high' then return 'high'; end if;
  if l ~ 'low' then return 'low'; end if;
  if l ~ '(med|mid|average)' then return 'mid'; end if;
  if l ~ '^\d+(\.\d+)?\s*(/|of|out of)\s*\d+(\.\d+)?$' then
    n := (regexp_match(l, '^(\d+(?:\.\d+)?)'))[1]::numeric;
    m := (regexp_match(l, '(?:/|of)\s*(\d+(?:\.\d+)?)$'))[1]::numeric;
  elsif l ~ '^\d+(\.\d+)?$' then
    n := l::numeric;
    if s ~ '\d+\s*(-|–|to)\s*\d+' then
      m := (regexp_match(s, '\d+\s*(?:-|–|to)\s*(\d+)'))[1]::numeric;
    elsif s ~ '^\d+' then
      m := (regexp_match(s, '^(\d+)'))[1]::numeric;
    end if;
  end if;
  if n is null or m is null or m <= 0 or n < 0 or n > m then
    return null;
  end if;
  r := n / m;
  return case when r <= 0.4 then 'low' when r <= 0.7 then 'mid' else 'high' end;
end;
$$;

revoke all on function public.tournament_volatility_band(text, text) from public, anon, authenticated;
grant execute on function public.tournament_volatility_band(text, text) to service_role;

-- ---------------------------------------------------------------------
-- Session bankroll for n spins at bet b (USD):
--   expected loss  n x b x e
--   SD             sqrt(n) x b x sigma      (sigma from bankroll_rule)
--   bankroll       expected loss + sd_multiple x SD, but never more than the
--                  session's total stake (n x b): a session can't lose more
--                  than it stakes, which caps short high-volatility sessions
-- e defaults to default_edge; band is 'low' | 'mid' | 'high' (anything else
-- counts as unknown). Returns no row for spins or bet <= 0.
-- Examples: 5,000 spins at 0.10, mid: loss 20.00, SD 42.43, bankroll 147.28.
-- 200 spins at 0.20, unknown band: loss 1.60, SD 56.57, bankroll 40.00
-- (the stake).
-- ---------------------------------------------------------------------
create or replace function public.tournament_session_bankroll(
  p_spins   numeric,
  p_bet_usd numeric,
  p_band    text    default null,
  p_edge    numeric default null)
returns table (
  spins             numeric,
  bet_usd           numeric,
  edge              numeric,
  band              text,
  sigma             numeric,
  sigma_basis       text,
  expected_loss_usd numeric,
  sd_usd            numeric,
  bankroll_usd      numeric)
language sql
stable
set search_path = ''
as $$
  with r as (
    select
      coalesce((select s.value from public.tournament_settings s where s.key = 'bankroll_rule'), '{}'::jsonb) as rule,
      coalesce(p_edge,
               (select (s.value #>> '{}')::numeric from public.tournament_settings s where s.key = 'default_edge'),
               0.04) as e,
      case when p_band in ('low','mid','high') then p_band else 'unknown' end as b
  ),
  k as (
    select r.e, r.b,
           coalesce((r.rule ->> 'sd_multiple')::numeric, 3) as mult,
           coalesce((r.rule #>> array['sigma_by_band', r.b])::numeric,
                    case r.b when 'low' then 4 when 'mid' then 6 else 20 end) as sig
    from r
  )
  select
    p_spins,
    p_bet_usd,
    k.e,
    k.b,
    k.sig,
    case when k.b = 'unknown' then 'volatility unknown: assumed the high band'
         else k.b || ' volatility band: assumed per-spin SD, not measured' end
      || case when p_spins * p_bet_usd * k.e + k.mult * sqrt(p_spins) * p_bet_usd * k.sig > p_spins * p_bet_usd
              then '; capped at the session''s total stake' else '' end,
    round(p_spins * p_bet_usd * k.e, 2),
    round(sqrt(p_spins) * p_bet_usd * k.sig, 2),
    round(least(p_spins * p_bet_usd,
                p_spins * p_bet_usd * k.e + k.mult * sqrt(p_spins) * p_bet_usd * k.sig), 2)
  from k
  where p_spins > 0 and p_bet_usd > 0;
$$;

revoke all on function public.tournament_session_bankroll(numeric, numeric, text, numeric) from public, anon, authenticated;
grant execute on function public.tournament_session_bankroll(numeric, numeric, text, numeric) to service_role;

-- ---------------------------------------------------------------------
-- This week's loss against weekly_loss_limit (weeks start Monday 00:00 CT).
-- An entry counts in the week it was played: its event's end, or when it was
-- logged if that's earlier (an entry for a live event). Its loss is
-- net_result_sweeps when logged; without one, the expected loss of what it
-- wagered (sweeps_wagered x default_edge), and entries_missing_net counts
-- those. Converted to USD. Prizes are left out on purpose (they arrive later
-- and carry playthrough), so the loss reads high rather than low.
-- room_left_usd is NULL while no limit is set.
-- ---------------------------------------------------------------------
create or replace view public.tournament_bankroll_status
with (security_invoker = true) as
with lim as (
  select
    (select (s.value #>> '{}')::numeric from public.tournament_settings s where s.key = 'weekly_loss_limit') as limit_usd,
    (date_trunc('week', now() at time zone 'America/Chicago')) at time zone 'America/Chicago'               as week_start,
    coalesce((select (s.value #>> '{}')::numeric from public.tournament_settings s where s.key = 'default_edge'), 0.04) as e
),
wk as (
  select count(en.id)                                         as entries,
         count(en.id) filter (where en.net_result_sweeps is null) as missing_net,
         sum(coalesce(en.net_result_sweeps, -coalesce(en.sweeps_wagered, 0) * lim.e)
             / ts.units_per_usd)                              as net_usd
  from public.tournament_entries en
  join public.tournaments t       on t.id = en.tournament_id
  join public.tournament_sites ts on ts.id = t.site_id
  cross join lim
  where least(en.created_at, coalesce(t.ends_at, en.created_at)) >= lim.week_start
)
select
  lim.limit_usd                                                    as weekly_loss_limit_usd,
  lim.limit_usd is null                                            as limit_unset,
  to_char(lim.week_start at time zone 'America/Chicago', 'Dy Mon DD') as week_starts_ct,
  coalesce(wk.entries, 0)                                          as entries_this_week,
  round(greatest(0, -coalesce(wk.net_usd, 0)), 2)                  as loss_this_week_usd,
  case when lim.limit_usd is not null
       then round(greatest(0, lim.limit_usd - greatest(0, -coalesce(wk.net_usd, 0))), 2) end as room_left_usd,
  coalesce(wk.missing_net, 0)                                      as entries_missing_net
from lim
cross join wk;

-- ---------------------------------------------------------------------
-- Live ranked events in sweeps mode: the latest last-paid threshold
-- projected to the end, against the break-even line of the cheapest rank
-- that pays sweeps coins. GC boards (currency_mode 'GC' or
-- format_params.board 'GC') are left out, and so are their readings.
-- The line is tournament_tier_math's, P(1-e)/e, except that the bet for a
-- spin race is the event's min_bet, else the lowest measured min bet among
-- its games, else reference_min_bet (bet_used; bet_is_reference says which),
-- the same bet as tournament_event_math.
--   method  learned           the median final / reading for this site,
--                             format and hours-to-end bucket, once
--                             min_finals_to_learn finished events are behind it
--           pace_plus_buffer  threshold x event length / hours elapsed
--                             x (1 + late_surge_buffer)
--           final             read in the last 30 minutes: as read
--           needs_start       no start time, so no pace (only the
--                             already-over test applies)
--   call    under_line / over_line (projection vs the line at the default
--           edge), over_line_already (the current reading is already over),
--           no_line (a format without a break-even line here),
--           no_projection.
-- Volume races compare USD (site units converted); spin counts compare spins.
-- site_format_readings counts every sweeps-mode threshold reading for this
-- site and format: the policy's play_to_place needs 3.
-- ---------------------------------------------------------------------
create or replace view public.tournament_threshold_projection
with (security_invoker = true) as
with cfg as (
  select
    coalesce((select (s.value ->> 'late_surge_buffer')::numeric   from public.tournament_settings s where s.key = 'threshold_projection'), 0.30) as buffer,
    coalesce((select (s.value ->> 'min_finals_to_learn')::integer from public.tournament_settings s where s.key = 'threshold_projection'), 3)    as min_finals,
    coalesce((select (s.value #>> '{}')::numeric from public.tournament_settings s where s.key = 'default_edge'), 0.04)      as e1,
    coalesce((select (s.value #>> '{}')::numeric from public.tournament_settings s where s.key = 'pessimistic_edge'), 0.06)  as e2,
    coalesce((select (s.value #>> '{}')::numeric from public.tournament_settings s where s.key = 'reference_min_bet'), 0.10) as ref_bet
),
ev as (
  select t.id, t.site_id, ts.slug as site, ts.units_per_usd, t.name, t.slug, t.format_code,
         t.starts_at, t.ends_at,
         coalesce((t.format_params ->> 'min_bet')::numeric,
                  (select min(g.min_bet_sweeps)
                     from public.tournament_eligible_games eg
                     join public.tournament_games g on g.id = eg.game_id
                    where eg.tournament_id = t.id)) / ts.units_per_usd as stated_or_measured_bet
  from public.tournaments t
  join public.tournament_sites ts on ts.id = t.site_id
  where t.status = 'live'
    and t.ends_at > now()
    and t.format_code in ('volume_wager','spin_count','total_win','sum_multipliers')
    and (t.format_params ->> 'split_pool') is distinct from 'true'
    and t.currency_mode is distinct from 'GC'
    and (t.format_params ->> 'board') is distinct from 'GC'
),
latest as (
  select distinct on (sn.tournament_id)
         sn.tournament_id, sn.observed_at, sn.hours_to_end, sn.threshold_last_paid
  from public.tournament_snapshots sn
  where sn.threshold_last_paid is not null
    and sn.tournament_id in (select id from ev)
  order by sn.tournament_id, sn.observed_at desc, sn.id desc
),
x as (
  select ev.*, l.observed_at, l.threshold_last_paid,
         coalesce(l.hours_to_end, extract(epoch from (ev.ends_at - l.observed_at)) / 3600) as hours_to_end,
         extract(epoch from (l.observed_at - ev.starts_at)) / 3600                         as elapsed_h,
         extract(epoch from (ev.ends_at - ev.starts_at)) / 3600                            as length_h
  from ev
  join latest l on l.tournament_id = ev.id
),
b as (
  select x.*,
         case when x.hours_to_end <= 2  then '0-2h'
              when x.hours_to_end <= 12 then '2-12h'
              when x.hours_to_end <= 24 then '12-24h'
              else '24h+' end as bucket
  from x
),
-- Learned growth: final / reading, per site, format and bucket, from events
-- that have a reading in their last 30 minutes (that reading is the final).
-- Same buckets as tournament_threshold_curve, but it counts finished events
-- (not readings) and leaves the final reading itself out of its own bucket.
obs as (
  select ts.slug as site, t.format_code, sn.tournament_id, sn.observed_at,
         sn.hours_to_end, sn.threshold_last_paid,
         case when sn.hours_to_end <= 2  then '0-2h'
              when sn.hours_to_end <= 12 then '2-12h'
              when sn.hours_to_end <= 24 then '12-24h'
              else '24h+' end as bucket
  from public.tournament_snapshots sn
  join public.tournaments t       on t.id = sn.tournament_id
  join public.tournament_sites ts on ts.id = t.site_id
  where sn.threshold_last_paid is not null
    and sn.hours_to_end is not null
    and t.currency_mode is distinct from 'GC'
    and (t.format_params ->> 'board') is distinct from 'GC'
),
fin as (
  select distinct on (tournament_id) tournament_id, threshold_last_paid as final_threshold
  from obs
  where hours_to_end <= 0.5
  order by tournament_id, observed_at desc
),
learn as (
  select o.site, o.format_code, o.bucket,
         percentile_cont(0.5) within group (order by f.final_threshold / nullif(o.threshold_last_paid, 0)) as growth,
         count(distinct o.tournament_id) as finished_events
  from obs o
  join fin f on f.tournament_id = o.tournament_id
  where o.hours_to_end > 0.5
  group by o.site, o.format_code, o.bucket
),
p as (
  select b.*,
         lr.growth::numeric as learned_growth,
         lr.finished_events,
         case when b.hours_to_end <= 0.5 then 'final'
              when lr.growth is not null and lr.finished_events >= cfg.min_finals then 'learned'
              when b.elapsed_h >= 1 and b.length_h > b.elapsed_h then 'pace_plus_buffer'
              when b.starts_at is null then 'needs_start'
              else 'no_projection' end as method,
         cfg.buffer
  from b
  cross join cfg
  left join learn lr
         on lr.site = b.site and lr.format_code = b.format_code and lr.bucket = b.bucket
),
pr as (
  select p.*,
         case p.method
           when 'final'            then p.threshold_last_paid
           when 'learned'          then p.threshold_last_paid * p.learned_growth
           when 'pace_plus_buffer' then p.threshold_last_paid * p.length_h / p.elapsed_h * (1 + p.buffer)
         end as projected
  from p
),
line as (
  -- the cheapest rank that pays sweeps coins (GC-only tiers have no cash value)
  select distinct on (pt.tournament_id)
         pt.tournament_id, pt.rank_from, pt.rank_to,
         pt.prize_sweeps / ev.units_per_usd as prize_usd
  from public.tournament_payout_tiers pt
  join ev on ev.id = pt.tournament_id
  where pt.prize_sweeps > 0
  order by pt.tournament_id, pt.rank_to desc, pt.rank_from desc
),
cmp as (
  select pr.*, ln.rank_from, ln.rank_to, bt.bet_used, pr.stated_or_measured_bet is null as bet_is_reference,
         case pr.format_code
           when 'volume_wager' then round(ln.prize_usd * (1 - cfg.e1) / cfg.e1, 0)
           when 'spin_count'   then round(ln.prize_usd * (1 - cfg.e1) / cfg.e1 / bt.pos_bet, 0) end as line_default,
         case pr.format_code
           when 'volume_wager' then round(ln.prize_usd * (1 - cfg.e2) / cfg.e2, 0)
           when 'spin_count'   then round(ln.prize_usd * (1 - cfg.e2) / cfg.e2 / bt.pos_bet, 0) end as line_pessimistic,
         case pr.format_code
           when 'volume_wager' then pr.threshold_last_paid / pr.units_per_usd
           when 'spin_count'   then pr.threshold_last_paid end          as current_cmp,
         case pr.format_code
           when 'volume_wager' then pr.projected / pr.units_per_usd
           when 'spin_count'   then pr.projected end                    as projected_cmp
  from pr
  cross join cfg
  cross join lateral (
    select coalesce(pr.stated_or_measured_bet, cfg.ref_bet) as bet_used,
           case when coalesce(pr.stated_or_measured_bet, cfg.ref_bet) > 0
                then coalesce(pr.stated_or_measured_bet, cfg.ref_bet) end as pos_bet
  ) bt
  left join line ln on ln.tournament_id = pr.id
)
select
  cmp.id                                                     as tournament_id,
  cmp.site,
  cmp.name,
  cmp.slug,
  cmp.format_code,
  cmp.ends_at,
  to_char(cmp.ends_at at time zone 'America/Chicago', 'Dy Mon DD HH12:MI AM') || ' CT' as ends_ct,
  cmp.observed_at                                            as reading_at,
  round(cmp.hours_to_end, 1)                                 as hours_to_end,
  cmp.bucket,
  cmp.threshold_last_paid                                    as threshold_now,
  cmp.method,
  round(cmp.learned_growth, 3)                               as learned_growth,
  cmp.finished_events                                        as learned_from_events,
  case when cmp.method = 'pace_plus_buffer' then cmp.buffer end as surge_buffer,
  round(cmp.projected, 0)                                    as threshold_projected,
  case when cmp.format_code = 'spin_count' then 'spins' else 'usd' end as compare_unit,
  round(cmp.current_cmp, 2)                                  as now_compared,
  round(cmp.projected_cmp, 2)                                as projected_compared,
  cmp.rank_from || coalesce('-' || nullif(cmp.rank_to, cmp.rank_from)::text, '') as cheapest_rank,
  cmp.line_default,
  cmp.line_pessimistic,
  case when cmp.line_default is null                then 'no_line'
       when cmp.current_cmp >= cmp.line_default     then 'over_line_already'
       when cmp.projected_cmp is null               then 'no_projection'
       when cmp.projected_cmp < cmp.line_default    then 'under_line'
       else 'over_line' end                          as call,
  (select count(*)
     from public.tournament_snapshots s2
     join public.tournaments t2 on t2.id = s2.tournament_id
    where t2.site_id = cmp.site_id and t2.format_code = cmp.format_code
      and s2.threshold_last_paid is not null
      and t2.currency_mode is distinct from 'GC'
      and (t2.format_params ->> 'board') is distinct from 'GC') as site_format_readings,
  round(cmp.bet_used, 4)                                     as bet_used,
  cmp.bet_is_reference
from cmp;

-- ---------------------------------------------------------------------
-- Eligible games of each open event, ranked the way the event's format wants
-- (pick_rank 1 first). RTP, max win, min bet, lines and pace come only from
-- the site's own facts (in-game and owner readings). Volatility is the game's
-- own label when one was read, else the provider's (vol_source says which);
-- both sort the same, and a provider band never counts as measured.
--   volume_wager, total_win        highest RTP, lowest volatility, fastest
--   spin_count                     no bonus-only games, lowest min bet, lowest
--                                  volatility, fastest, highest RTP
--   max_multiplier, max_win        uncapped (max win 1,000x or more) first,
--                                  highest max win, highest volatility,
--                                  lowest min bet
--   target_multiplier              lands_target first (lines test: target x
--                                  lines is whole; NULL for ways or unknown
--                                  lines, which come next), then lowest min
--                                  bet (the session is capped in spins, so the
--                                  bet sets its cost), most lines, fastest
--   anything else (raffles, random prizes, points)
--                                  lowest min bet, fastest, lowest volatility
-- facts_status: measured (every in-game fact the format's order uses is in;
-- the bonus-only flag is research context), partial, or missing; missing
-- names them.
-- ---------------------------------------------------------------------
create or replace view public.tournament_game_picks
with (security_invoker = true) as
with ev as (
  select t.id, ts.slug as site, ts.units_per_usd, t.name, t.format_code, t.ends_at, t.format_params
  from public.tournaments t
  join public.tournament_sites ts on ts.id = t.site_id
  where t.status in ('upcoming','live')
    and t.ends_at > now()
),
g as (
  select
    ev.id as tournament_id, ev.site, ev.name as event, ev.format_code, ev.ends_at,
    gm.id as game_id, gm.name as game, gm.provider,
    round(gm.min_bet_sweeps / ev.units_per_usd, 4) as min_bet_usd,
    gm.rtp_onsite,
    gm.rtp_onsite is null and gm.rtp_not_shown_at is not null as rtp_not_shown,
    public.tournament_volatility_band(gm.volatility_label, gm.volatility_scale) as band_in_game,
    case when gm.volatility in ('low','low-medium')     then 'low'
         when gm.volatility in ('medium','medium-high') then 'mid'
         when gm.volatility in ('high','very-high')     then 'high' end as band_provider,
    gm.max_win_x_onsite, gm.spins_per_hour, gm.line_mode, gm.paylines, gm.base_game_pays,
    case when jsonb_typeof(ev.format_params -> 'target_x') = 'number'
         then (ev.format_params ->> 'target_x')::numeric end as target_x
  from ev
  join public.tournament_eligible_games eg on eg.tournament_id = ev.id
  join public.tournament_games gm          on gm.id = eg.game_id
),
f as (
  select g.*,
    coalesce(g.band_in_game, g.band_provider) as vol_band,
    case when g.band_in_game is not null then 'in_game'
         when g.band_provider is not null then 'provider' end as vol_source,
    case coalesce(g.band_in_game, g.band_provider) when 'low' then 1 when 'mid' then 2 when 'high' then 3 end as vol_rank,
    case when g.target_x is null or g.line_mode is distinct from 'lines' or g.paylines is null then null
         else (g.target_x * g.paylines) = trunc(g.target_x * g.paylines) end as lands_target,
    coalesce(g.max_win_x_onsite < 1000, false) as capped
  from g
),
k as (
  select f.*,
    case
      when f.format_code in ('volume_wager','total_win') then
        array[coalesce(-f.rtp_onsite, 1e12), coalesce(f.vol_rank, 1e12),
              coalesce(-f.spins_per_hour, 1e12), coalesce(f.min_bet_usd, 1e12)]
      when f.format_code = 'spin_count' then
        array[case when f.base_game_pays is false then 1 else 0 end, coalesce(f.min_bet_usd, 1e12),
              coalesce(f.vol_rank, 1e12), coalesce(-f.spins_per_hour, 1e12), coalesce(-f.rtp_onsite, 1e12)]
      when f.format_code in ('max_multiplier','max_win') then
        array[case when f.capped then 1 else 0 end, coalesce(-f.max_win_x_onsite, 1e12),
              coalesce(-f.vol_rank, 1e12), coalesce(f.min_bet_usd, 1e12)]
      when f.format_code = 'target_multiplier' then
        array[case f.lands_target when true then 0 when false then 2 else 1 end,
              coalesce(f.min_bet_usd, 1e12), coalesce(-f.paylines, 1e12), coalesce(-f.spins_per_hour, 1e12)]
      else
        array[coalesce(f.min_bet_usd, 1e12), coalesce(-f.spins_per_hour, 1e12), coalesce(f.vol_rank, 1e12)]
    end::numeric[] as sort_key,
    concat_ws(', ',
      case when f.min_bet_usd is null then 'min SC bet' end,
      case when f.format_code in ('volume_wager','total_win','spin_count') and f.rtp_onsite is null
           then case when f.rtp_not_shown then 'RTP (not shown in game)' else 'in-game RTP' end end,
      case when f.format_code <> 'target_multiplier' and f.band_in_game is null
           then 'in-game volatility' end,
      case when f.format_code in ('max_multiplier','max_win') and f.max_win_x_onsite is null
           then 'in-game max win' end,
      case when f.format_code = 'target_multiplier' and f.line_mode is null
           then 'lines or ways' end,
      case when f.format_code not in ('max_multiplier','max_win') and f.spins_per_hour is null
           then 'spins per hour' end) as missing
  from f
)
select
  k.tournament_id,
  k.site,
  k.event,
  k.format_code,
  k.ends_at,
  row_number() over (partition by k.tournament_id order by k.sort_key, k.game) as pick_rank,
  k.game_id,
  k.game,
  k.provider,
  k.min_bet_usd,
  k.rtp_onsite,
  k.rtp_not_shown,
  k.vol_band,
  k.vol_source,
  k.max_win_x_onsite,
  k.capped,
  k.spins_per_hour,
  k.line_mode,
  k.paylines,
  k.lands_target,
  k.base_game_pays,
  case when k.missing = '' then 'measured'
       when k.min_bet_usd is null and k.rtp_onsite is null and k.band_in_game is null
            and k.max_win_x_onsite is null and k.line_mode is null and k.spins_per_hour is null then 'missing'
       else 'partial' end as facts_status,
  nullif(k.missing, '') as missing
from k;

-- ---------------------------------------------------------------------
-- Questions only a site's support can answer. Shown in tournament_data_gaps
-- (kind 'question', priority 2) until answered with
--   Tournament answer <site> <topic>: <what support said>
-- format_code (optional) ties a question to a format, so its needed_by is
-- the next open event of that format on the site.
-- ---------------------------------------------------------------------
create table if not exists public.tournament_owner_questions (
  id           bigint generated always as identity primary key,
  site_id      bigint      references public.tournament_sites (id) on delete cascade,
  format_code  text        references public.tournament_formats (code),
  topic        text        not null,
  question     text        not null,
  ask_where    text,
  status       text        not null default 'open' check (status in ('open','answered','withdrawn')),
  answer       text,
  answered_at  timestamptz,
  created_at   timestamptz not null default now(),
  constraint tournament_owner_questions_site_topic_key unique nulls not distinct (site_id, topic)
);

alter table public.tournament_owner_questions enable row level security;
revoke all on public.tournament_owner_questions from anon, authenticated;
comment on table public.tournament_owner_questions is
  'Tournament desk: questions only a site''s support can answer, shown in tournament_data_gaps until answered.';

insert into public.tournament_owner_questions (site_id, format_code, topic, question, ask_where)
select ts.id, 'target_multiplier', 'target_closest_rule',
       'Hit the Multiplier: when fewer players than the prize places hit the target exactly, are the closest places measured on both sides of the target or only from below it, and how are ties broken?',
       'Luck Party support'
from public.tournament_sites ts
where ts.slug = 'luckparty'
on conflict on constraint tournament_owner_questions_site_topic_key do nothing;

-- ---------------------------------------------------------------------
-- tournament_data_gaps (part 4) plus one branch: open questions (kind
-- 'question', priority 2). Same columns, so tournament_fact_queue, which
-- reads this view, is unaffected.
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
-- Questions only the site's support can answer (part 5).
select
  coalesce(ts.slug, 'all'),
  'question',
  q.question,
  'an answer from ' || coalesce(q.ask_where, 'the site''s support'),
  2,
  (select min(e.ends_at) from open_ev e
    where e.site_id = q.site_id
      and (q.format_code is null or e.format_code = q.format_code)),
  'Ask ' || coalesce(q.ask_where, 'the site''s support') || ', then send: Tournament answer '
    || coalesce(ts.slug, 'all') || ' ' || q.topic || ': <what they said>'
from public.tournament_owner_questions q
left join public.tournament_sites ts on ts.id = q.site_id
where q.status = 'open'
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

comment on view public.tournament_data_gaps is
  'Tournament desk: in-game facts, leaderboard readings (qualifier counts for even-split events), pace and questions for a site''s support that the desk still needs, most urgent first, plus the game facts check''s priority-0 flags (changed RTP, no RTP shown, needs sign-in, check not run). Only the owner can fill them.';

-- ---------------------------------------------------------------------
-- Candidates from the research report. The general desk checks
-- sweep_candidates_per_day of them a day, oldest first.
-- ---------------------------------------------------------------------
insert into public.tournament_sites (slug, name, catalog_name, base_url, status, notes) values
  ('high5', 'High 5 Casino', 'High5', 'https://high5casino.com', 'candidate',
   'Research report 2026-10-02 (weak source): daily leaderboard games marked with a podium icon in the lobby; no prize figures found. Probably in-app only.'),
  ('myprize', 'MyPrize', 'MyPrize', 'https://myprize.us', 'candidate',
   'Research report 2026-10-02 (affiliate news): studio-sponsored leaderboards, e.g. a 3 Oaks leaderboard with a 10,000 SC pool. Read the site''s own terms for each one.'),
  ('sweepshark', 'Sweep Shark', 'Sweep Shark', 'https://sweepshark.com', 'candidate',
   'Research report 2026-10-02 (affiliate news): a BetSoft-sponsored 10,000 SC tournament. Unconfirmed on the site.')
on conflict (slug) do nothing;

-- A US sweeps "Drops & Wins" is the operator's own promo (changed only while
-- the note is still part 1's).
update public.tournament_formats
   set notes = 'Pragmatic-style daily tournaments. Pragmatic Play said in Sept 2025 that it would stop licensing its games to US sweeps operators in states without restrictions, so a US sweeps "Drops & Wins" is the operator''s own promo: read that site''s terms, never the network''s.'
 where code = 'sum_multipliers'
   and notes = 'Pragmatic-style daily tournaments.';

-- ---------------------------------------------------------------------
-- play_policy: the rules that send the desks to the views above. Added once,
-- while the policy has no bankroll rule; an owner's later edit is kept.
-- ---------------------------------------------------------------------
update public.tournament_settings s
   set value = s.value
     || jsonb_build_object(
          'amended_on', '2026-10-02',
          'summary', 'Free entries always. Planned SC rides free in whatever SC event is live. Hit the Multiplier early and capped. Volume races only for the cheapest rank whose projected threshold is under its line. Max Multiplier incidental unless the field is small. Every play_to_place session is sized at expected loss + 3 SD and has to fit the room left under the weekly loss limit; never buy coins to chase a board.')
     || jsonb_build_object('rules', coalesce(s.value -> 'rules', '{}'::jsonb)
          || jsonb_build_object(
               'bankroll', $j${
                 "rule": "Size every play_to_place session with tournament_session_bankroll(spins, bet_usd, vol_band): expected loss + sd_multiple x SD from bankroll_rule, capped at the stake. It returns USD; the card's bankroll_sweeps is bankroll_usd x the site's units_per_usd. When weekly_loss_limit is set and bankroll_usd is more than tournament_bankroll_status.room_left_usd, the verdict drops to incidental. With no limit set, the card says so.",
                 "never_buy_to_chase": "Never buy coins to climb a leaderboard; only purchases the owner would make anyway."
               }$j$::jsonb,
               'game_choice', $j${
                 "rule": "Pick games from tournament_game_picks for the event, pick_rank 1 first: the format's order over the site's own facts. Volatility is the provider's when the game's own label hasn't been read (vol_source says which). Put its facts_status on the card; anything but measured keeps data_status at template or partial."
               }$j$::jsonb,
               'volume_wager', coalesce(s.value #> '{rules,volume_wager}', '{}'::jsonb)
                 || jsonb_build_object('projection', 'Use tournament_threshold_projection: learned growth once the hours-to-end bucket has min_finals_to_learn finished events, else straight-line pace to the end x (1 + late_surge_buffer). Only call = under_line, with 3 site_format_readings, can make it play_to_place; over_line and over_line_already mean incidental.'),
               'spin_count', coalesce(s.value #> '{rules,spin_count}', '{}'::jsonb)
                 || jsonb_build_object('projection', 'Same as volume_wager, compared in spins at the view''s bet_used: the event''s min_bet, else its games'' lowest measured min bet, else reference_min_bet (bet_is_reference).'),
               'target_multiplier', coalesce(s.value #> '{rules,target_multiplier}', '{}'::jsonb)
                 || jsonb_build_object('closest_rule', 'Whether the closest places count distance on both sides of the target is an open question (tournament_owner_questions, topic target_closest_rule). Until it is answered, play only for the first exact hits; the closest places are incidental.')))
 where s.key = 'play_policy'
   and not coalesce((s.value -> 'rules') ? 'bankroll', false);

-- A database that ran this file's first version (live, 2026-10-02 afternoon)
-- gets the corrected rule texts; an owner's later edit is kept.
update public.tournament_settings s
   set value = jsonb_set(jsonb_set(jsonb_set(s.value,
         '{rules,bankroll,rule}',       to_jsonb('Size every play_to_place session with tournament_session_bankroll(spins, bet_usd, vol_band): expected loss + sd_multiple x SD from bankroll_rule, capped at the stake. It returns USD; the card''s bankroll_sweeps is bankroll_usd x the site''s units_per_usd. When weekly_loss_limit is set and bankroll_usd is more than tournament_bankroll_status.room_left_usd, the verdict drops to incidental. With no limit set, the card says so.'::text)),
         '{rules,game_choice,rule}',    to_jsonb('Pick games from tournament_game_picks for the event, pick_rank 1 first: the format''s order over the site''s own facts. Volatility is the provider''s when the game''s own label hasn''t been read (vol_source says which). Put its facts_status on the card; anything but measured keeps data_status at template or partial.'::text)),
         '{rules,spin_count,projection}', to_jsonb('Same as volume_wager, compared in spins at the view''s bet_used: the event''s min_bet, else its games'' lowest measured min bet, else reference_min_bet (bet_is_reference).'::text))
 where s.key = 'play_policy'
   and s.value #>> '{rules,bankroll,rule}' = 'Size every play_to_place session with tournament_session_bankroll(spins, bet_usd, vol_band): expected loss + sd_multiple x SD from bankroll_rule. Put it on the card as bankroll_sweeps (in the site''s unit). When weekly_loss_limit is set and the bankroll is more than tournament_bankroll_status.room_left_usd, the verdict drops to incidental. With no limit set, the card says so.';

-- ---------------------------------------------------------------------
-- Owner/service-role only.
-- ---------------------------------------------------------------------
revoke all on public.tournament_bankroll_status, public.tournament_threshold_projection,
              public.tournament_game_picks, public.tournament_data_gaps
  from anon, authenticated;

comment on view public.tournament_bankroll_status is
  'Tournament desk: this week''s loss from logged entries against weekly_loss_limit (weeks start Monday CT), and the room left.';
comment on view public.tournament_threshold_projection is
  'Tournament desk: each live ranked event''s last-paid threshold projected to its end (learned growth, else pace x late-surge buffer) against the cheapest paid rank''s break-even line.';
comment on view public.tournament_game_picks is
  'Tournament desk: each open event''s eligible games ranked for its format from the site''s own facts, with what is still missing.';

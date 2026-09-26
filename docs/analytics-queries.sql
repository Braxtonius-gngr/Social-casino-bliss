-- Saved queries over public.app_events. Run in the Supabase SQL editor.
-- One "user" is one auth user (anonymous sign-ins included); events are only
-- recorded while that device has Cloud Sync on.

-- Daily active users, last 30 days.
select date_trunc('day', created_at) as day, count(distinct user_id) as dau
from public.app_events
where name = 'app_open' and created_at > now() - interval '30 days'
group by 1 order by 1;

-- Weekly retention: of users first seen in week W, how many opened the app again
-- in each following week.
with first_seen as (
  select user_id, date_trunc('week', min(created_at)) as cohort
  from public.app_events where name = 'app_open' group by 1
), activity as (
  select distinct user_id, date_trunc('week', created_at) as week
  from public.app_events where name = 'app_open'
)
select f.cohort,
       count(distinct f.user_id) as users,
       count(distinct a.user_id) filter (where a.week = f.cohort + interval '1 week') as week_1,
       count(distinct a.user_id) filter (where a.week = f.cohort + interval '2 weeks') as week_2,
       count(distinct a.user_id) filter (where a.week = f.cohort + interval '4 weeks') as week_4
from first_seen f left join activity a using (user_id)
group by 1 order by 1 desc;

-- Activation and revenue funnel, last 30 days: opened -> tracked a platform ->
-- ran a Daily Run -> turned on background alerts -> started checkout -> became Pro.
with recent as (
  select user_id, name from public.app_events where created_at > now() - interval '30 days'
)
select
  count(distinct user_id) filter (where name = 'app_open') as opened,
  count(distinct user_id) filter (where name = 'platform_tracked') as tracked_platform,
  count(distinct user_id) filter (where name = 'daily_run_started') as ran_daily_run,
  count(distinct user_id) filter (where name = 'push_enabled') as enabled_push,
  count(distinct user_id) filter (where name = 'checkout_started') as started_checkout,
  count(distinct user_id) filter (where name = 'pro_activated') as became_pro
from recent;

-- Where new users come from (the src= tag on links into the app, e.g. SEO pages).
select coalesce(props ->> 'src', 'direct') as source, count(distinct user_id) as users
from public.app_events
where name = 'app_open' and created_at > now() - interval '30 days'
group by 1 order by 2 desc;

-- Most-tracked platforms this month (what the catalog should verify first).
select props ->> 'name' as platform, count(*) as adds
from public.app_events
where name = 'platform_tracked' and created_at > now() - interval '30 days'
group by 1 order by 2 desc limit 25;

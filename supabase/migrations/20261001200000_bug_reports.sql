-- Tester bug reports and ideas, kept here as well as posted to Discord.
--
-- Until now the in-app feedback form posted an embed straight from the
-- browser to a Discord webhook, so the only record was the channel and the
-- webhook URL shipped in index.html. From here the form calls the bug-report
-- edge function, which writes a row here first and then forwards the same
-- embed to Discord from a secret. The daily "way forward" brief reads
-- status='new' rows next to catalog_sweep_findings.
create table if not exists public.bug_reports (
  id               bigint generated always as identity primary key,
  category         text        not null check (category in ('Timer bug','Catalogue/rule correction','Feature idea','Other')),
  body             text        not null check (char_length(body) between 1 and 4000),
  -- Diagnostics the form attaches on its own.
  user_agent       text,
  app_build        text,                                 -- APP_BUILD at the time, e.g. almanac-v85
  catalog_version  text,                                 -- catalogVersionLabel() at the time
  theme            text,                                 -- data-theme in effect, e.g. western
  tracked_count    integer,
  recent_errors    jsonb       not null default '[]'::jsonb, -- recentAppErrors, newest last
  user_id          uuid,                                 -- the signed-in account (anonymous ones count), if any
  ip_hash          text,                                 -- sha-256 of the caller address + salt, for rate limiting only
  origin           text,
  -- Where the Discord copy got to. The row is kept either way.
  discord_status   text        not null default 'pending' check (discord_status in ('pending','sent','failed','skipped')),
  -- Triage, written by the owner or the daily brief session.
  status           text        not null default 'new' check (status in ('new','triaged','fixed','wontfix','duplicate')),
  triage_note      text,
  resolved_pr      text,
  resolved_at      timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists bug_reports_open_idx
  on public.bug_reports (status, created_at desc);

create index if not exists bug_reports_rate_idx
  on public.bug_reports (ip_hash, created_at desc);

-- Owner/service-role only. The edge function writes with the service role;
-- the PWA never reads this.
alter table public.bug_reports enable row level security;
revoke all on public.bug_reports from anon, authenticated;

comment on table public.bug_reports is
  'In-app bug reports and ideas (bug-report edge function). new -> triaged/fixed by the owner or the daily brief; a copy goes to Discord.';

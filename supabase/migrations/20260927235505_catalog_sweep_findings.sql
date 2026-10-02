-- Findings from the unattended daily catalog sweep, written when the worker
-- cannot reach the GitHub repo. A session WITH repo access reads status='pending'
-- rows, applies them to data/catalog.json, opens the PR, and marks them applied.
create table if not exists public.catalog_sweep_findings (
  id               bigint generated always as identity primary key,
  sweep_date       date        not null,                 -- America/Chicago date of the run
  platform_name    text        not null,                 -- exact catalog entry name
  catalog_version  text,                                 -- catalog_releases.version the entry was read from
  verdict          text        not null check (verdict in ('changed','confirmed','conflict','blocked','dead','no-source')),
  proposed_changes jsonb       not null default '{}'::jsonb, -- {"field": {"old": ..., "new": ...}}
  sweep_note       text        not null,                 -- full "SWEEP YYYY-MM-DD (...): ..." block to prepend to notes
  set_last_verified boolean    not null default false,   -- true only when the lastVerified contract was met
  conflicts        jsonb       not null default '[]'::jsonb, -- [{"field","catalog","page","source"}]
  sources          jsonb       not null default '[]'::jsonb, -- official URLs read
  summary          text,                                 -- one line for the PR table
  status           text        not null default 'pending' check (status in ('pending','applied','dismissed','superseded')),
  applied_pr       text,
  applied_at       timestamptz,
  run_session      text,
  created_at       timestamptz not null default now(),
  unique (sweep_date, platform_name)
);

create index if not exists catalog_sweep_findings_pending_idx
  on public.catalog_sweep_findings (status, sweep_date desc);

-- Owner/service-role only. No anon or authenticated policies: the PWA never reads this.
alter table public.catalog_sweep_findings enable row level security;
revoke all on public.catalog_sweep_findings from anon, authenticated;

comment on table public.catalog_sweep_findings is
  'Unattended catalog sweep output (per platform, per day). pending -> applied by a repo-access session that opens the PR.';

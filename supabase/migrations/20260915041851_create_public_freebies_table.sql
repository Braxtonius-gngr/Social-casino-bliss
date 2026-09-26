create table public.public_freebies (
  id uuid primary key default gen_random_uuid(),
  platform_name text not null,
  bucket text not null check (bucket in ('A_code', 'B_claim', 'C_purchase')),
  code text,
  claim_url text,
  root_domain text,
  is_account_tied boolean not null default false,
  terms text,
  expires_at timestamptz,
  source_note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.public_freebies is 'Curated freebie/bonus codes and claim links shown to all app users. Writable only via service_role (Supabase dashboard or MCP) — not from the client app. Populated by the Drop Inbox classify-and-curate workflow.';

alter table public.public_freebies enable row level security;

-- Anyone (including anonymous app users) can read active entries. No insert/update/delete
-- policies are defined for anon/authenticated, so client-side writes are impossible under
-- RLS -- only service_role (dashboard SQL editor, or an MCP session like this one) can
-- write, which matches the curation workflow: Braxtonius classifies locally, then pushes.
create policy "public_freebies_public_read"
  on public.public_freebies
  for select
  to anon, authenticated
  using (active = true);

create index public_freebies_active_expires_idx
  on public.public_freebies (active, expires_at);

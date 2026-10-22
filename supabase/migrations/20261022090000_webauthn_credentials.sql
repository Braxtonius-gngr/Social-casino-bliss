-- WebAuthn credentials for the dev overlay 2FA gate.
-- Only the owner registers a credential (from their biometric-locked phone);
-- every dev-overlay session authenticates against it.

create table if not exists public.webauthn_credentials (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key    text not null,            -- base64url-encoded COSE key
  counter       bigint not null default 0,
  transports    text[] default '{}',
  created_at    timestamptz not null default now()
);

-- only the owner row's user can read/write their credentials
alter table public.webauthn_credentials enable row level security;

create policy "owner reads own credentials"
  on public.webauthn_credentials for select
  using (auth.uid() = user_id);

create policy "owner inserts own credentials"
  on public.webauthn_credentials for insert
  with check (auth.uid() = user_id);

create policy "owner updates own credentials"
  on public.webauthn_credentials for update
  using (auth.uid() = user_id);

-- challenges are ephemeral: stored briefly during the WebAuthn ceremony
create table if not exists public.webauthn_challenges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  challenge   text not null,
  type        text not null check (type in ('registration', 'authentication')),
  created_at  timestamptz not null default now()
);

alter table public.webauthn_challenges enable row level security;

create policy "owner reads own challenges"
  on public.webauthn_challenges for select
  using (auth.uid() = user_id);

create policy "owner inserts own challenges"
  on public.webauthn_challenges for insert
  with check (auth.uid() = user_id);

create policy "owner deletes own challenges"
  on public.webauthn_challenges for delete
  using (auth.uid() = user_id);

-- auto-expire challenges older than 5 minutes (a cron or manual cleanup)
-- For now just index by created_at for easy cleanup queries
create index if not exists idx_webauthn_challenges_created
  on public.webauthn_challenges (created_at);

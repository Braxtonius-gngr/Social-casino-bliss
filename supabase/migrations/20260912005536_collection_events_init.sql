-- Append-only-ish event log for collection history ("the ledger"), the
-- data the client's local collectionHistory array represents. Each row is
-- one collection record; a correction to its timestamp is an update to
-- the same id (not a new row), and a deletion is a tombstone (deleted =
-- true) rather than a hard DELETE, so other devices pulling changes since
-- their last sync can learn about the deletion and remove it locally too
-- instead of silently resurrecting it on their next push.

create table if not exists public.collection_events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  platform_name text not null,
  collected_at timestamptz not null,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists collection_events_user_updated_idx
  on public.collection_events (user_id, updated_at);

-- Keep updated_at server-authoritative so a client can page "what changed
-- since my last pull" using it, regardless of what the client sends.
create or replace function public.collection_events_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if tg_op = 'INSERT' then
    new.created_at = coalesce(new.created_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists collection_events_touch on public.collection_events;
create trigger collection_events_touch
  before insert or update on public.collection_events
  for each row execute function public.collection_events_set_updated_at();

alter table public.collection_events enable row level security;

create policy "collection_events_select_own"
  on public.collection_events for select
  to authenticated
  using (auth.uid() = user_id);

create policy "collection_events_insert_own"
  on public.collection_events for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "collection_events_update_own"
  on public.collection_events for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

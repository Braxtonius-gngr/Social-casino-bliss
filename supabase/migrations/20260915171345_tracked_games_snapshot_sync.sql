-- Cross-device deck sync: one row per account holding a full snapshot of
-- trackedGames (platforms, timers, tiers, notes, referral links - the
-- Settings copy used to say this never left the browser; it now mirrors
-- here under the same Cloud Sync toggle that already covers collection
-- history). This is a WHOLE-DECK, last-write-wins overwrite, not a merge -
-- deliberately, to match collection_events' "simple, explicit" style rather
-- than building real conflict resolution for a single-user tool. Editing
-- the deck on two devices before either syncs means whichever push lands
-- last wins for the whole deck.
create table public.tracked_games_snapshot (
  user_id uuid primary key references auth.users(id) on delete cascade,
  games jsonb not null default '[]'::jsonb,
  device_id text,
  updated_at timestamptz not null default now()
);

alter table public.tracked_games_snapshot enable row level security;

create policy tracked_games_snapshot_select_own
  on public.tracked_games_snapshot
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy tracked_games_snapshot_insert_own
  on public.tracked_games_snapshot
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy tracked_games_snapshot_update_own
  on public.tracked_games_snapshot
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.tracked_games_snapshot_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tracked_games_snapshot_touch
  before insert or update on public.tracked_games_snapshot
  for each row execute function public.tracked_games_snapshot_set_updated_at();

comment on table public.tracked_games_snapshot is 'One row per account: a full snapshot of the client''s trackedGames array (deck + timers), upserted by the app''s Cloud Sync. Last-write-wins by updated_at, not merged. RLS: readable/writable only by the owning auth.uid().';

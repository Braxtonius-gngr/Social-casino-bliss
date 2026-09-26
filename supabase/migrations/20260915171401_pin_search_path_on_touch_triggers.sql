-- Closes the "mutable search_path" advisory on the two touch-trigger
-- functions just added: pinning search_path means they can't be tricked by
-- a session that's redefined an object earlier in a mutable path.
alter function public.public_freebies_set_updated_at() set search_path = '';
alter function public.tracked_games_snapshot_set_updated_at() set search_path = '';

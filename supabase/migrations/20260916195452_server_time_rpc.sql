-- Lightweight server-time sync: a single, side-effect-free RPC the static
-- app can call to get an authoritative clock reading, so per-device timer
-- math isn't purely at the mercy of that device's own (sometimes wrong)
-- clock. Returns only the database's current timestamp - no auth required,
-- no data read, nothing sensitive - so it's safe to expose to anon the
-- same way any public NTP-style time endpoint would be.
create or replace function public.server_time()
returns timestamptz
language sql
stable
set search_path = 'pg_catalog', 'public'
as $$
  select now();
$$;

grant execute on function public.server_time() to anon, authenticated;

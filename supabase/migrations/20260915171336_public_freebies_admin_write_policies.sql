-- Gives the single admin identity (johndopamine210@gmail.com) full CRUD on
-- public_freebies via a small in-app admin page, replacing the manual
-- SQL/MCP insert workflow. The existing public_freebies_public_read policy
-- (active=true only, anon+authenticated) is untouched - these are ADDITIONAL
-- permissive policies, so the public read path is unaffected either way.
--
-- Enforcement is server-side (RLS), not client-side: even if the admin
-- page's own "is this the admin?" check were bypassed, Postgres still
-- rejects the write unless the signed-in JWT's email matches exactly.

create policy public_freebies_admin_read
  on public.public_freebies
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'johndopamine210@gmail.com');

create policy public_freebies_admin_insert
  on public.public_freebies
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'johndopamine210@gmail.com');

create policy public_freebies_admin_update
  on public.public_freebies
  for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'johndopamine210@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'johndopamine210@gmail.com');

create policy public_freebies_admin_delete
  on public.public_freebies
  for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'johndopamine210@gmail.com');

-- No updated_at trigger existed yet (prior writes were all manual/MCP, which
-- set it explicitly). The admin page relies on the server stamping this
-- itself so client clock skew can't misrepresent "last edited."
create or replace function public.public_freebies_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger public_freebies_touch
  before insert or update on public.public_freebies
  for each row execute function public.public_freebies_set_updated_at();

comment on table public.public_freebies is 'Curated freebie/bonus codes and claim links shown to all app users. Publicly readable (active rows only). Writable by the admin identity (johndopamine210@gmail.com) via the in-app admin page, gated by RLS on auth.jwt() email - or via the Supabase dashboard/MCP.';

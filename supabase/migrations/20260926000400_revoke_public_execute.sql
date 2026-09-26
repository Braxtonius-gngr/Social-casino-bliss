-- Follow-up to 20260926000100: the live get_my_entitlement() and
-- rls_auto_enable() still carry the default EXECUTE grant to PUBLIC, which
-- anon inherits, so revoking from anon alone left them callable signed out.
-- Signed-in callers (including anonymous sign-ins) keep their explicit grant.
REVOKE EXECUTE ON FUNCTION public.get_my_entitlement() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_entitlement() TO authenticated;

DO $$
BEGIN
  -- Supabase's own event-trigger function; only touched if present.
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END
$$;

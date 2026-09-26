-- Hardening from the Supabase security and performance advisors (2026-09-26).
-- Nothing here changes what a signed-in user (including an anonymous
-- sign-in, which has the authenticated role) can do.

-- Supabase grants EXECUTE on new public functions to anon and authenticated
-- directly, so the phase-3/4 "REVOKE ... FROM PUBLIC" left signed-out API
-- callers able to reach these SECURITY DEFINER functions. Each already
-- refuses a caller without auth.uid(); this removes them from the anon
-- surface entirely instead of relying on that check.
REVOKE EXECUTE ON FUNCTION public.cast_drop_vote(UUID, SMALLINT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_community_profile() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fetch_open_drop_reports() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fetch_pending_drop_submissions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_entitlement() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_moderator() FROM anon;
REVOKE EXECUTE ON FUNCTION public.moderate_drop_submission(UUID, public.drop_status_type, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.moderate_redemption_report(UUID, public.drop_status_type, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_community_drop(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_drop_report(UUID, public.report_reason_type, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_redemption_report(TEXT, DATE, DATE, DATE, public.redemption_method_type, public.amount_band_type, TEXT) FROM anon;

-- Trigger-only functions have no business on the RPC surface at all.
-- (EXECUTE is checked when a trigger is created, not each time it fires.)
REVOKE EXECUTE ON FUNCTION public.set_phase3_updated_at() FROM anon, authenticated;
DO $$
BEGIN
  -- Supabase's own "auto-enable RLS on new tables" event trigger function;
  -- not created by these migrations, so only touched if present.
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
  END IF;
END
$$;

-- my_entitlements filters on auth.uid() and user_subscriptions already has an
-- owner-read policy, so the view can run as the caller instead of its owner.
ALTER VIEW public.my_entitlements SET (security_invoker = true);

-- A dashboard-created duplicate of user_subscriptions_owner_read (same
-- predicate, same role). Two permissive policies are evaluated per row.
DROP POLICY IF EXISTS "Users can read own subscription" ON public.user_subscriptions;

-- Evaluate auth.uid()/auth.jwt() once per query rather than once per row.
ALTER POLICY user_subscriptions_owner_read ON public.user_subscriptions
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY community_profiles_owner_read ON public.community_profiles
  USING ((SELECT auth.uid()) = id OR (SELECT public.is_moderator()));
ALTER POLICY drop_submissions_owner_or_moderator_read ON public.drop_submissions
  USING ((SELECT auth.uid()) = submitted_by OR (SELECT public.is_moderator()));
ALTER POLICY drop_votes_owner_read ON public.drop_votes
  USING ((SELECT auth.uid()) = voter_id OR (SELECT public.is_moderator()));
ALTER POLICY drop_reports_owner_or_moderator_read ON public.drop_reports
  USING ((SELECT auth.uid()) = reporter_id OR (SELECT public.is_moderator()));
ALTER POLICY redemption_reports_owner_or_moderator_read ON public.redemption_reports
  USING ((SELECT auth.uid()) = submitted_by OR (SELECT public.is_moderator()));
ALTER POLICY public_freebies_admin_read ON public.public_freebies
  USING (((SELECT auth.jwt()) ->> 'email') = 'johndopamine210@gmail.com');
ALTER POLICY public_freebies_admin_insert ON public.public_freebies
  WITH CHECK (((SELECT auth.jwt()) ->> 'email') = 'johndopamine210@gmail.com');
ALTER POLICY public_freebies_admin_update ON public.public_freebies
  USING (((SELECT auth.jwt()) ->> 'email') = 'johndopamine210@gmail.com')
  WITH CHECK (((SELECT auth.jwt()) ->> 'email') = 'johndopamine210@gmail.com');
ALTER POLICY public_freebies_admin_delete ON public.public_freebies
  USING (((SELECT auth.jwt()) ->> 'email') = 'johndopamine210@gmail.com');

-- Foreign keys without a covering index (user-deletion cascades scan these).
CREATE INDEX IF NOT EXISTS drop_reports_reporter_idx ON public.drop_reports (reporter_id);
CREATE INDEX IF NOT EXISTS drop_votes_voter_idx ON public.drop_votes (voter_id);
CREATE INDEX IF NOT EXISTS moderation_actions_actor_idx ON public.moderation_actions (actor_id);
CREATE INDEX IF NOT EXISTS redemption_reports_submitter_idx ON public.redemption_reports (submitted_by);

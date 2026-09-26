-- Self-serve deletion (Settings -> Delete My Cloud Data). Deleting the
-- caller's auth.users row removes everything stored with the account: every
-- user table here references auth.users ON DELETE CASCADE (collection_events,
-- tracked_games_snapshot, push_subscriptions, app_events, community_profiles,
-- drop_submissions and their votes and reports, redemption_reports,
-- user_subscriptions), and so do Supabase's own sessions and identities.
--
-- Two cases are refused rather than half-done:
--   ACTIVE_SUBSCRIPTION - a Stripe subscription that hasn't ended would keep
--     billing with no account left to manage it, and its webhooks would have
--     no row to update. The user cancels in Manage Billing first; once it has
--     ended, deletion goes through.
--   MODERATOR_ACCOUNT - deleting a moderator would cascade away the
--     moderation audit trail (moderation_actions.actor_id).
-- Stripe keeps its own customer and payment records for accounting.

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller UUID := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'NOT_SIGNED_IN: there is no account to delete';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_subscriptions AS s
    WHERE s.user_id = caller
      AND s.stripe_subscription_id IS NOT NULL
      AND s.status::TEXT NOT IN ('canceled', 'incomplete_expired')
  ) THEN
    RAISE EXCEPTION 'ACTIVE_SUBSCRIPTION: cancel the Pro subscription first; once it has ended the account can be deleted';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.community_profiles AS p
    WHERE p.id = caller AND p.is_moderator
  ) THEN
    RAISE EXCEPTION 'MODERATOR_ACCOUNT: moderator accounts are not deleted here';
  END IF;

  DELETE FROM auth.users WHERE id = caller;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

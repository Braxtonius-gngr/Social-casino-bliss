-- Least privilege for the browser roles.
--
-- Supabase's default privileges hand anon and authenticated every table
-- privilege on every new table; policies then decide what those grants
-- can actually reach. That works, but it leaves TRUNCATE, REFERENCES and
-- TRIGGER lying around where no policy ever needed them, and it means a
-- table that ships without RLS is wide open. This migration keeps only
-- the grants the app uses, stops new tables from inheriting the rest, and
-- turns the two public views into ordinary invoker views over narrow
-- column grants and published-row policies, so nothing bypasses RLS.

-- ---------------------------------------------------------------------
-- Tables: only what a policy can use.
-- ---------------------------------------------------------------------

-- Own collection history: upsert (insert + update) and read. Nothing
-- without a session (anon).
REVOKE ALL ON public.collection_events FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.collection_events TO authenticated;

-- Own deck snapshot: the same shape.
REVOKE ALL ON public.tracked_games_snapshot FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tracked_games_snapshot TO authenticated;

-- Freebies: everyone reads active rows; the admin (by policy) writes.
REVOKE ALL ON public.public_freebies FROM anon, authenticated;
GRANT SELECT ON public.public_freebies TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.public_freebies TO authenticated;

-- Entitlements view: read by the signed-in account only.
REVOKE ALL ON public.my_entitlements FROM anon, authenticated;
GRANT SELECT ON public.my_entitlements TO authenticated;

-- ---------------------------------------------------------------------
-- published_drops: an invoker view. Published, unexpired drops are public
-- by definition, but only the columns the view shows: who submitted a
-- drop, its code and the submitter's note stay out of reach.
-- ---------------------------------------------------------------------
REVOKE ALL ON public.drop_submissions FROM anon, authenticated;
GRANT SELECT (id, platform_id, platform_name, bucket, claim_url, root_domain, terms, expires_at, created_at, status)
  ON public.drop_submissions TO anon, authenticated;

DROP POLICY IF EXISTS drop_submissions_published_read ON public.drop_submissions;
CREATE POLICY drop_submissions_published_read ON public.drop_submissions
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND (expires_at IS NULL OR expires_at > now()));

-- Votes: the tally is public, the voter is not.
REVOKE ALL ON public.drop_votes FROM anon, authenticated;
GRANT SELECT (drop_id, vote) ON public.drop_votes TO anon, authenticated;

DROP POLICY IF EXISTS drop_votes_tally_read ON public.drop_votes;
CREATE POLICY drop_votes_tally_read ON public.drop_votes
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.drop_submissions AS d
    WHERE d.id = drop_votes.drop_id
      AND d.status = 'published'
      AND (d.expires_at IS NULL OR d.expires_at > now())
  ));

ALTER VIEW public.published_drops SET (security_invoker = true);
REVOKE ALL ON public.published_drops FROM anon, authenticated;
GRANT SELECT ON public.published_drops TO anon, authenticated;

-- ---------------------------------------------------------------------
-- platform_speed_rollups: an invoker view over published redemption
-- reports, exposing only the dates the medians are built from. The
-- method, amount band, note and reporter stay private.
-- ---------------------------------------------------------------------
REVOKE ALL ON public.redemption_reports FROM anon, authenticated;
GRANT SELECT (platform_id, requested_on, approved_on, received_on, status)
  ON public.redemption_reports TO anon, authenticated;

DROP POLICY IF EXISTS redemption_reports_published_read ON public.redemption_reports;
CREATE POLICY redemption_reports_published_read ON public.redemption_reports
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

ALTER VIEW public.platform_speed_rollups SET (security_invoker = true);
REVOKE ALL ON public.platform_speed_rollups FROM anon, authenticated;
GRANT SELECT ON public.platform_speed_rollups TO anon, authenticated;

-- ---------------------------------------------------------------------
-- New objects start with nothing. Every table and RPC that the browser
-- should reach now says so with an explicit GRANT in its migration.
-- ---------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

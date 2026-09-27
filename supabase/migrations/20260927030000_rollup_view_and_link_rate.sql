-- Follow-ups to least_privilege and catalog_service.
--
-- 1. platform_speed_rollups is redefined from the columns the browser
--    roles were granted. The committed definition counted distinct
--    reporters (submitted_by), which the live view no longer did and which
--    the column grant deliberately leaves private; a database built from
--    the migrations alone would have refused the view to anon.
-- 2. The `go` redirect's per-address rate limit moves into the database.
--    An in-memory counter lives in one edge-function isolate; several can
--    run at once, so it was advisory. This is one row per address per
--    minute, keyed by a hash so no address is stored.
-- 3. Default privileges are revoked from PUBLIC too. Postgres grants
--    EXECUTE on new functions to PUBLIC, which anon and authenticated
--    inherit, so revoking from those two roles alone left new functions
--    callable through the API until their migration said otherwise.
-- 4. publish_catalog() keeps only the catalogue's known public fields, so
--    a field added to data/catalog.json later cannot carry a link to the
--    browser by accident. Anything else is dropped and reported. The
--    origin is also cut case-insensitively, matching the classifier, so an
--    upper-case scheme cannot slip a referral link through.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC;

CREATE OR REPLACE VIEW public.platform_speed_rollups AS
WITH accepted AS (
  SELECT
    platform_id,
    (approved_on - requested_on)::NUMERIC AS days_to_approve,
    (received_on - requested_on)::NUMERIC AS days_to_receive
  FROM public.redemption_reports
  WHERE status = 'published'
    AND received_on IS NOT NULL
    AND approved_on IS NOT NULL
)
SELECT
  platform_id,
  COUNT(*)::INT AS sample_count,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_to_approve::DOUBLE PRECISION)::NUMERIC, 1) AS median_days_to_approve,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_to_receive::DOUBLE PRECISION)::NUMERIC, 1) AS median_days_to_receive,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY days_to_receive::DOUBLE PRECISION)::NUMERIC, 1) AS p75_days_to_receive,
  CASE
    WHEN COUNT(*) >= 20 THEN 'high'
    WHEN COUNT(*) >= 10 THEN 'medium'
    ELSE 'low'
  END AS confidence_rating
FROM accepted
GROUP BY platform_id
HAVING COUNT(*) >= 5;

ALTER VIEW public.platform_speed_rollups SET (security_invoker = true);
REVOKE ALL ON public.platform_speed_rollups FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.platform_speed_rollups TO anon, authenticated;

-- Link requests per address per minute. The key is a hash the edge
-- function computes from the trusted client address; rows older than an
-- hour are swept opportunistically.
CREATE TABLE IF NOT EXISTS public.link_requests (
  key_hash TEXT NOT NULL,
  minute TIMESTAMPTZ NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key_hash, minute)
);
ALTER TABLE public.link_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.link_requests FROM PUBLIC, anon, authenticated;

-- For the `go` edge function only (service role): count this request and
-- say whether it is within the limit for the current minute.
CREATE OR REPLACE FUNCTION public.allow_link_request(p_key_hash TEXT, p_limit INTEGER DEFAULT 30)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  n INTEGER;
BEGIN
  INSERT INTO public.link_requests (key_hash, minute, hits)
  VALUES (p_key_hash, date_trunc('minute', now()), 1)
  ON CONFLICT (key_hash, minute) DO UPDATE SET hits = link_requests.hits + 1
  RETURNING hits INTO n;
  IF random() < 0.01 THEN
    DELETE FROM public.link_requests WHERE minute < now() - INTERVAL '1 hour';
  END IF;
  RETURN n <= GREATEST(COALESCE(p_limit, 30), 1);
END;
$$;

REVOKE ALL ON FUNCTION public.allow_link_request(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allow_link_request(TEXT, INTEGER) TO service_role;

-- The fields the app reads from a catalogue entry. `url` is rebuilt from
-- the plain address and `hasReferral` added; nothing else passes.
CREATE OR REPLACE FUNCTION public.catalog_public_fields()
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT ARRAY[
    'name', 'tier', 'dailySC', 'scSource', 'scIsAveraged', 'scRange', 'speedHours',
    'reliability', 'cooldown', 'resetHour', 'resetTZ', 'hasLive', 'minRedeem',
    'cashFloor', 'daysToRedeem', 'redeemTarget', 'confidence', 'lastVerified',
    'ladder', 'ladderNote', 'redeemMethods', 'notes', 'noGuaranteedDaily', 'blocker'
  ];
$$;

REVOKE ALL ON FUNCTION public.catalog_public_fields() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.publish_catalog(p_catalog JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  payload JSONB;
  new_version TEXT;
  latest TEXT;
  n INTEGER;
  i INTEGER;
  dropped TEXT[];
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'OWNER_ONLY: only the owner publishes the catalogue';
  END IF;
  IF jsonb_typeof(p_catalog) <> 'array' OR jsonb_array_length(p_catalog) = 0 THEN
    RAISE EXCEPTION 'BAD_CATALOG: expected a non-empty array of platforms';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_catalog) AS e
    WHERE jsonb_typeof(e) <> 'object'
       OR coalesce(trim(e->>'name'), '') = ''
       OR coalesce(e->>'url', '') !~* '^https?://'
  ) THEN
    RAISE EXCEPTION 'BAD_CATALOG: every platform needs a name and an http(s) url';
  END IF;
  IF (SELECT count(*) - count(DISTINCT lower(trim(e->>'name'))) FROM jsonb_array_elements(p_catalog) AS e) > 0 THEN
    RAISE EXCEPTION 'BAD_CATALOG: duplicate platform names';
  END IF;

  DROP TABLE IF EXISTS incoming;
  CREATE TEMP TABLE incoming ON COMMIT DROP AS
  SELECT
    ord,
    e,
    trim(e->>'name') AS name,
    lower(trim(e->>'name')) AS name_key,
    e->>'url' AS launch_url,
    public.catalog_url_is_referral(e->>'url') AS has_referral,
    CASE WHEN public.catalog_url_is_referral(e->>'url')
         THEN regexp_replace(e->>'url', '^(https?://[^/?#]+).*$', '\1', 'i')
         ELSE e->>'url' END AS public_url
  FROM jsonb_array_elements(p_catalog) WITH ORDINALITY AS t(e, ord);

  INSERT INTO public.platform_links AS l (name, name_key, launch_url, public_url, has_referral, updated_at)
  SELECT name, name_key, launch_url, public_url, has_referral, now() FROM incoming
  ON CONFLICT (name_key) DO UPDATE
    SET name = EXCLUDED.name, launch_url = EXCLUDED.launch_url, public_url = EXCLUDED.public_url,
        has_referral = EXCLUDED.has_referral, updated_at = now()
    WHERE (l.name, l.launch_url, l.public_url, l.has_referral)
          IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.launch_url, EXCLUDED.public_url, EXCLUDED.has_referral);
  DELETE FROM public.platform_links WHERE name_key NOT IN (SELECT name_key FROM incoming);

  -- Only the known public fields survive, in the entry's own order.
  SELECT jsonb_agg(
           COALESCE((SELECT jsonb_object_agg(f.key, f.value) FROM jsonb_each(e) AS f WHERE f.key = ANY (public.catalog_public_fields())), '{}'::jsonb)
           || jsonb_build_object('url', public_url, 'hasReferral', has_referral)
           ORDER BY ord),
         count(*)
    INTO payload, n
  FROM incoming;
  SELECT array_agg(DISTINCT f.key ORDER BY f.key) INTO dropped
  FROM incoming, jsonb_each(e) AS f
  WHERE f.key <> 'url' AND NOT (f.key = ANY (public.catalog_public_fields()));
  new_version := md5(payload::text);

  SELECT version INTO latest FROM public.catalog_releases ORDER BY id DESC LIMIT 1;
  IF latest IS DISTINCT FROM new_version THEN
    INSERT INTO public.catalog_releases (version, payload, entry_count, published_by)
    VALUES (new_version, payload, n, auth.uid());
    DELETE FROM public.catalog_releases
    WHERE id NOT IN (SELECT id FROM public.catalog_releases ORDER BY id DESC LIMIT 20);
  END IF;
  SELECT count(*) INTO i FROM incoming WHERE has_referral;
  DROP TABLE incoming;
  RETURN jsonb_build_object('version', new_version, 'entries', n, 'changed', latest IS DISTINCT FROM new_version,
                            'referralLinks', i, 'droppedFields', to_jsonb(COALESCE(dropped, ARRAY[]::TEXT[])));
END;
$$;

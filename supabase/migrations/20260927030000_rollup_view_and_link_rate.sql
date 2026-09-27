-- Two follow-ups to least_privilege and catalog_service.
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

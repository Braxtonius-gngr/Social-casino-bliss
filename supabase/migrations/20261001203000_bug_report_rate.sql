-- Follow-ups from review of the bug-report function (PR #122).
--
-- 1. The rate limit moves into the database so a parallel burst cannot slip
--    past it: the function counts the request and answers in one statement,
--    the same shape as allow_link_request for the `go` function.
-- 2. With that, bug_reports no longer needs the caller's hashed address:
--    ip_hash is no longer written. The column stays, nullable and empty, so
--    this migration is purely additive; a later one may drop it.
-- 3. `theme` records the skin itself (getActiveThemeId()), not the look the
--    stylesheet keys on: Executive Lounge and Refinement x Realization share
--    a look but differ in effects, and a bug report must tell them apart.

-- Bug reports per address per hour. The key is a hash the edge function
-- computes from the trusted client address; rows older than a day are
-- swept opportunistically.
CREATE TABLE IF NOT EXISTS public.bug_report_rate (
  key_hash TEXT NOT NULL,
  hour TIMESTAMPTZ NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key_hash, hour)
);
ALTER TABLE public.bug_report_rate ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bug_report_rate FROM PUBLIC, anon, authenticated;

-- For the bug-report edge function only (service role): count this request
-- and say whether it is within the limit for the current hour.
CREATE OR REPLACE FUNCTION public.allow_bug_report(p_key_hash TEXT, p_limit INTEGER DEFAULT 10)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  n INTEGER;
BEGIN
  INSERT INTO public.bug_report_rate (key_hash, hour, hits)
  VALUES (p_key_hash, date_trunc('hour', now()), 1)
  ON CONFLICT (key_hash, hour) DO UPDATE SET hits = bug_report_rate.hits + 1
  RETURNING hits INTO n;
  IF random() < 0.01 THEN
    DELETE FROM public.bug_report_rate WHERE hour < now() - INTERVAL '1 day';
  END IF;
  RETURN n <= GREATEST(COALESCE(p_limit, 10), 1);
END;
$$;

REVOKE ALL ON FUNCTION public.allow_bug_report(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allow_bug_report(TEXT, INTEGER) TO service_role;

COMMENT ON COLUMN public.bug_reports.ip_hash IS
  'Unused since 2026-10-01: the rate limit lives in bug_report_rate. Kept nullable so the migration stays additive.';

COMMENT ON COLUMN public.bug_reports.theme IS
  'The skin in effect when the report was sent (getActiveThemeId(), e.g. western, executive, refinement) - not the data-theme look, which skins can share.';

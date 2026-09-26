-- Phase 3 community data foundation.
-- Raw tables are private. Client writes go through the SECURITY DEFINER RPCs
-- below, while public reads go through sanitized views only.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  CREATE TYPE public.drop_status_type AS ENUM ('pending', 'published', 'rejected', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.report_reason_type AS ENUM ('expired', 'invalid_code', 'misleading', 'duplicate', 'spam');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.report_status_type AS ENUM ('open', 'reviewed', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.redemption_method_type AS ENUM ('instant_bank', 'ach', 'gift_card', 'crypto', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.amount_band_type AS ENUM ('under_50', '50_to_100', '100_to_500', 'over_500');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.moderation_action_type AS ENUM ('approve', 'reject', 'quarantine', 'ban_user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.community_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  public_alias TEXT NOT NULL CHECK (char_length(public_alias) BETWEEN 1 AND 40),
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  is_moderator BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.drop_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id TEXT NOT NULL CHECK (char_length(platform_id) BETWEEN 1 AND 120),
  platform_name TEXT NOT NULL CHECK (char_length(platform_name) BETWEEN 1 AND 160),
  bucket TEXT NOT NULL DEFAULT 'daily' CHECK (bucket IN ('code', 'daily', 'purchase')),
  code_value TEXT CHECK (code_value IS NULL OR char_length(code_value) <= 500),
  claim_url TEXT NOT NULL CHECK (claim_url ~* '^https://'),
  root_domain TEXT NOT NULL CHECK (char_length(root_domain) BETWEEN 1 AND 253),
  terms TEXT CHECK (terms IS NULL OR char_length(terms) <= 1000),
  expires_at TIMESTAMPTZ,
  source_note TEXT CHECK (source_note IS NULL OR char_length(source_note) <= 1000),
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.drop_status_type NOT NULL DEFAULT 'pending',
  moderation_reason TEXT CHECK (moderation_reason IS NULL OR char_length(moderation_reason) <= 1000),
  content_hash TEXT NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT drop_expiry_in_future CHECK (expires_at IS NULL OR expires_at > created_at)
);

CREATE TABLE IF NOT EXISTS public.drop_votes (
  drop_id UUID NOT NULL REFERENCES public.drop_submissions(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (drop_id, voter_id)
);

CREATE TABLE IF NOT EXISTS public.drop_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID NOT NULL REFERENCES public.drop_submissions(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason public.report_reason_type NOT NULL,
  detail TEXT CHECK (detail IS NULL OR char_length(detail) <= 1000),
  status public.report_status_type NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.redemption_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id TEXT NOT NULL CHECK (char_length(platform_id) BETWEEN 1 AND 120),
  requested_on DATE NOT NULL,
  approved_on DATE,
  received_on DATE,
  method public.redemption_method_type NOT NULL,
  amount_band public.amount_band_type NOT NULL,
  note TEXT CHECK (note IS NULL OR char_length(note) <= 1000),
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.drop_status_type NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT redemption_dates_monotonic CHECK (
    (approved_on IS NULL OR approved_on >= requested_on)
    AND (received_on IS NULL OR (approved_on IS NOT NULL AND received_on >= approved_on))
  )
);

CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('drop', 'report', 'redemption', 'profile')),
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action public.moderation_action_type NOT NULL,
  reason TEXT CHECK (reason IS NULL OR char_length(reason) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS drop_submissions_status_expiry_idx
  ON public.drop_submissions (status, expires_at);
CREATE INDEX IF NOT EXISTS drop_submissions_submitter_idx
  ON public.drop_submissions (submitted_by, created_at DESC);
CREATE INDEX IF NOT EXISTS drop_votes_drop_idx
  ON public.drop_votes (drop_id);
CREATE INDEX IF NOT EXISTS drop_reports_drop_idx
  ON public.drop_reports (drop_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS drop_reports_one_per_reporter_uidx
  ON public.drop_reports (drop_id, reporter_id);
CREATE INDEX IF NOT EXISTS redemption_reports_platform_status_idx
  ON public.redemption_reports (platform_id, status, received_on);
ALTER TABLE public.drop_submissions
  DROP CONSTRAINT IF EXISTS drop_content_hash_unique;
CREATE UNIQUE INDEX IF NOT EXISTS drop_submissions_active_hash_uidx
  ON public.drop_submissions (content_hash)
  WHERE status IN ('pending', 'published');

CREATE OR REPLACE FUNCTION public.set_phase3_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS drop_submissions_updated_at ON public.drop_submissions;
CREATE TRIGGER drop_submissions_updated_at
BEFORE UPDATE ON public.drop_submissions
FOR EACH ROW EXECUTE FUNCTION public.set_phase3_updated_at();

CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.is_moderator = TRUE
      AND profile.is_flagged = FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.create_community_profile()
RETURNS public.community_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  profile public.community_profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.community_profiles (id, public_alias)
  VALUES (auth.uid(), 'Player-' || substr(replace(auth.uid()::text, '-', ''), 1, 8))
  ON CONFLICT (id) DO NOTHING
  RETURNING * INTO profile;

  IF profile.id IS NULL THEN
    SELECT * INTO profile
    FROM public.community_profiles
    WHERE id = auth.uid();
  END IF;
  RETURN profile;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_active_member()
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.community_profiles
    WHERE id = auth.uid()
      AND is_flagged = TRUE
  ) THEN
    RAISE EXCEPTION 'Account is not permitted to contribute';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_community_drops()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.drop_submissions
  SET status = 'expired'
  WHERE status = 'published'
    AND expires_at IS NOT NULL
    AND expires_at <= now();
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_community_drop(
  p_platform_id TEXT,
  p_platform_name TEXT,
  p_claim_url TEXT,
  p_root_domain TEXT,
  p_bucket TEXT DEFAULT 'daily',
  p_terms TEXT DEFAULT NULL,
  p_code TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_source_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  normalized_platform_id TEXT := lower(trim(p_platform_id));
  normalized_platform_name TEXT := trim(p_platform_name);
  normalized_url TEXT := trim(p_claim_url);
  normalized_domain TEXT := lower(trim(p_root_domain));
  normalized_bucket TEXT := lower(trim(p_bucket));
  normalized_code TEXT := lower(trim(coalesce(p_code, '')));
  content_hash TEXT;
  new_id UUID;
BEGIN
  PERFORM public.assert_active_member();
  PERFORM public.expire_community_drops();
  IF length(normalized_platform_id) NOT BETWEEN 1 AND 120
    OR length(normalized_platform_name) NOT BETWEEN 1 AND 160
    OR length(normalized_domain) NOT BETWEEN 1 AND 253
    OR normalized_bucket NOT IN ('code', 'daily', 'purchase') THEN
    RAISE EXCEPTION 'Invalid drop fields';
  END IF;
  IF normalized_url !~* '^https://' THEN
    RAISE EXCEPTION 'Only HTTPS claim URLs are allowed';
  END IF;
  IF normalized_domain !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
    OR normalized_url ~ '[[:space:][:cntrl:]]'
    OR normalized_url !~* (
      '^https://([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)*'
      || regexp_replace(normalized_domain, '\.', '\\.', 'g')
      || '(:[0-9]{1,5})?([/?#]|$)'
    ) THEN
    RAISE EXCEPTION 'Claim URL must belong to the supplied root domain';
  END IF;
  IF p_expires_at IS NOT NULL AND p_expires_at <= now() THEN
    RAISE EXCEPTION 'Expiration must be in the future';
  END IF;
  IF length(coalesce(p_code, '')) > 500
    OR length(coalesce(p_terms, '')) > 1000
    OR length(coalesce(p_source_note, '')) > 1000 THEN
    RAISE EXCEPTION 'Drop field is too long';
  END IF;

  content_hash := encode(
    digest(
      normalized_platform_id || '|' || normalized_domain || '|' || normalized_bucket || '|'
      || CASE WHEN normalized_code = '' THEN lower(normalized_url) ELSE normalized_code END,
      'sha256'
    ),
    'hex'
  );

  INSERT INTO public.drop_submissions (
    platform_id, platform_name, claim_url, root_domain, bucket, terms,
    code_value, expires_at, source_note, submitted_by, status, content_hash
  )
  VALUES (
    normalized_platform_id, normalized_platform_name, normalized_url,
    normalized_domain, normalized_bucket, nullif(trim(p_terms), ''),
    nullif(trim(p_code), ''), p_expires_at, nullif(trim(p_source_note), ''),
    auth.uid(), 'pending', content_hash
  )
  RETURNING id INTO new_id;

  RETURN new_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'This drop has already been submitted';
END;
$$;

CREATE OR REPLACE FUNCTION public.cast_drop_vote(
  p_drop_id UUID,
  p_vote SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_active_member();
  IF p_vote NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'Vote must be -1 or 1';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.drop_submissions
    WHERE id = p_drop_id
      AND status = 'published'
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RAISE EXCEPTION 'Drop is not available for voting';
  END IF;

  INSERT INTO public.drop_votes (drop_id, voter_id, vote)
  VALUES (p_drop_id, auth.uid(), p_vote)
  ON CONFLICT (drop_id, voter_id)
  DO UPDATE SET vote = EXCLUDED.vote;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_drop_report(
  p_drop_id UUID,
  p_reason public.report_reason_type,
  p_detail TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_id UUID;
BEGIN
  PERFORM public.assert_active_member();
  IF p_detail IS NOT NULL AND length(p_detail) > 1000 THEN
    RAISE EXCEPTION 'Report detail is too long';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.drop_submissions
    WHERE id = p_drop_id AND status = 'published'
  ) THEN
    RAISE EXCEPTION 'Drop is not available for reporting';
  END IF;
  INSERT INTO public.drop_reports (drop_id, reporter_id, reason, detail)
  VALUES (p_drop_id, auth.uid(), p_reason, nullif(trim(p_detail), ''))
  ON CONFLICT (drop_id, reporter_id)
  DO UPDATE SET reason = EXCLUDED.reason, detail = EXCLUDED.detail
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_redemption_report(
  p_platform_id TEXT,
  p_requested_on DATE,
  p_approved_on DATE DEFAULT NULL,
  p_received_on DATE DEFAULT NULL,
  p_method public.redemption_method_type DEFAULT 'other',
  p_amount_band public.amount_band_type DEFAULT 'under_50',
  p_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_id UUID;
BEGIN
  PERFORM public.assert_active_member();
  IF length(trim(p_platform_id)) NOT BETWEEN 1 AND 120
    OR p_requested_on > current_date
    OR p_approved_on > current_date
    OR p_received_on > current_date
    OR (p_approved_on IS NOT NULL AND p_approved_on < p_requested_on)
    OR (p_received_on IS NOT NULL AND (p_approved_on IS NULL OR p_received_on < p_approved_on))
    OR length(coalesce(p_note, '')) > 1000 THEN
    RAISE EXCEPTION 'Invalid redemption report';
  END IF;

  INSERT INTO public.redemption_reports (
    platform_id, requested_on, approved_on, received_on, method,
    amount_band, note, submitted_by, status
  )
  VALUES (
    lower(trim(p_platform_id)), p_requested_on, p_approved_on, p_received_on,
    p_method, p_amount_band, nullif(trim(p_note), ''), auth.uid(), 'pending'
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE VIEW public.published_drops AS
SELECT
  drop.id,
  drop.platform_id,
  drop.platform_name,
  drop.bucket,
  drop.claim_url,
  drop.root_domain,
  drop.terms,
  drop.expires_at,
  drop.created_at,
  COALESCE(SUM(vote.vote), 0)::INT AS net_score
FROM public.drop_submissions AS drop
LEFT JOIN public.drop_votes AS vote ON vote.drop_id = drop.id
WHERE drop.status = 'published'
  AND (drop.expires_at IS NULL OR drop.expires_at > now())
GROUP BY
  drop.id, drop.platform_id, drop.platform_name, drop.bucket,
  drop.claim_url, drop.root_domain, drop.terms, drop.expires_at,
  drop.created_at;

CREATE OR REPLACE VIEW public.platform_speed_rollups AS
WITH accepted AS (
  SELECT
    platform_id,
    submitted_by,
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
  round(percentile_cont(0.50) WITHIN GROUP (ORDER BY days_to_approve)::NUMERIC, 1)
    AS median_days_to_approve,
  round(percentile_cont(0.50) WITHIN GROUP (ORDER BY days_to_receive)::NUMERIC, 1)
    AS median_days_to_receive,
  round(percentile_cont(0.75) WITHIN GROUP (ORDER BY days_to_receive)::NUMERIC, 1)
    AS p75_days_to_receive,
  CASE
    WHEN COUNT(DISTINCT submitted_by) >= 20 THEN 'high'
    WHEN COUNT(DISTINCT submitted_by) >= 10 THEN 'medium'
    ELSE 'low'
  END AS confidence_rating
FROM accepted
GROUP BY platform_id
HAVING COUNT(DISTINCT submitted_by) >= 5;

ALTER TABLE public.community_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drop_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drop_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drop_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemption_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.community_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.drop_submissions FROM anon, authenticated;
REVOKE ALL ON TABLE public.drop_votes FROM anon, authenticated;
REVOKE ALL ON TABLE public.drop_reports FROM anon, authenticated;
REVOKE ALL ON TABLE public.redemption_reports FROM anon, authenticated;
REVOKE ALL ON TABLE public.moderation_actions FROM anon, authenticated;

GRANT SELECT ON TABLE public.community_profiles TO authenticated;
GRANT SELECT ON TABLE public.drop_submissions TO authenticated;
GRANT SELECT ON TABLE public.drop_votes TO authenticated;
GRANT SELECT ON TABLE public.drop_reports TO authenticated;
GRANT SELECT ON TABLE public.redemption_reports TO authenticated;
GRANT SELECT ON TABLE public.moderation_actions TO authenticated;
GRANT SELECT ON public.published_drops TO anon, authenticated;
GRANT SELECT ON public.platform_speed_rollups TO anon, authenticated;

DROP POLICY IF EXISTS community_profiles_owner_read ON public.community_profiles;
DROP POLICY IF EXISTS community_profiles_owner_update ON public.community_profiles;
DROP POLICY IF EXISTS drop_submissions_owner_or_moderator_read ON public.drop_submissions;
DROP POLICY IF EXISTS drop_votes_owner_read ON public.drop_votes;
DROP POLICY IF EXISTS drop_reports_owner_or_moderator_read ON public.drop_reports;
DROP POLICY IF EXISTS redemption_reports_owner_or_moderator_read ON public.redemption_reports;
DROP POLICY IF EXISTS moderation_actions_moderator_read ON public.moderation_actions;

CREATE POLICY community_profiles_owner_read
  ON public.community_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_moderator());

CREATE POLICY drop_submissions_owner_or_moderator_read
  ON public.drop_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = submitted_by OR public.is_moderator());

CREATE POLICY drop_votes_owner_read
  ON public.drop_votes FOR SELECT
  TO authenticated
  USING (auth.uid() = voter_id OR public.is_moderator());

CREATE POLICY drop_reports_owner_or_moderator_read
  ON public.drop_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id OR public.is_moderator());

CREATE POLICY redemption_reports_owner_or_moderator_read
  ON public.redemption_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = submitted_by OR public.is_moderator());

CREATE POLICY moderation_actions_moderator_read
  ON public.moderation_actions FOR SELECT
  TO authenticated
  USING (public.is_moderator());

REVOKE ALL ON FUNCTION public.set_phase3_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_moderator() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_community_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_active_member() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_community_drops() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_community_drop(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cast_drop_vote(UUID, SMALLINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_drop_report(UUID, public.report_reason_type, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_redemption_report(TEXT, DATE, DATE, DATE, public.redemption_method_type, public.amount_band_type, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_community_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_moderator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_community_drop(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_drop_vote(UUID, SMALLINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_drop_report(UUID, public.report_reason_type, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_redemption_report(TEXT, DATE, DATE, DATE, public.redemption_method_type, public.amount_band_type, TEXT) TO authenticated;

-- The catalogue moves behind the database.
--
-- Until now data/catalog.json was a plain file on the site: the platform
-- rules, the ladders read from screenshots and the owner's referral links,
-- fetched by anyone in one request. From here the deployed site carries no
-- catalogue file. The app asks get_catalog() with the version it already
-- holds; only a signed-in account (the device's anonymous one counts) gets
-- an answer, an unchanged version costs nothing, and full downloads are
-- counted per account per day and refused past a ceiling. Referral links
-- never reach the browser at all: the published payload carries each
-- platform's plain address, and the app sends players through the `go`
-- edge function, which looks the referral link up in platform_links.

-- ---------------------------------------------------------------------
-- Tables. No browser role can touch them directly; the RPCs below are
-- SECURITY DEFINER and do their own checks.
-- ---------------------------------------------------------------------
-- Every publish that changes something is a new row; the newest row is
-- the live catalogue, and the last few before it stay for reference.
-- Re-publishing an older catalogue is a new release too, so version is
-- not unique here.
CREATE TABLE IF NOT EXISTS public.catalog_releases (
  id BIGSERIAL PRIMARY KEY,
  version TEXT NOT NULL,
  payload JSONB NOT NULL,
  entry_count INTEGER NOT NULL,
  published_by UUID,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_links (
  name TEXT PRIMARY KEY,
  name_key TEXT NOT NULL UNIQUE,
  launch_url TEXT NOT NULL,
  public_url TEXT NOT NULL,
  has_referral BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalog_access (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT current_date,
  full_reads INTEGER NOT NULL DEFAULT 0,
  checks INTEGER NOT NULL DEFAULT 0,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS public.link_hits (
  name TEXT NOT NULL,
  day DATE NOT NULL DEFAULT current_date,
  hits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (name, day)
);

ALTER TABLE public.catalog_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_hits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalog_releases, public.platform_links, public.catalog_access, public.link_hits FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.catalog_releases_id_seq FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- Which addresses are referral links. A plain address is the site's
-- origin plus, at most, a few lowercase page words (/home, /lobby,
-- /en/spin-wheel). Anything else - a query string, a code-shaped path
-- segment, a signup/register/redirect path, or the owner's handle - is a
-- referral link and stays out of the published payload.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.catalog_url_is_referral(p_url TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_url ~ '\?'
      OR p_url !~ '^https?://[^/?#]+(/[a-z][a-z-]{0,24}){0,3}/?$'
      OR p_url ~* '^https?://[^/?#]+/(r|c|i|go|ref|refer|referral|invite|join|raf|a|aff|af|partner|promo|invited|lp|signup|register)(/|$)'
      OR p_url ~* 'braxtonius';
$$;

REVOKE ALL ON FUNCTION public.catalog_url_is_referral(TEXT) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- Owner only: publish data/catalog.json as it is in the repo. Referral
-- links are split off into platform_links; the stored payload carries
-- each platform's plain origin instead, plus hasReferral so the app knows
-- to route OPEN through `go`. Re-publishing an identical catalogue is a
-- no-op that returns the existing version.
-- ---------------------------------------------------------------------
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
         THEN regexp_replace(e->>'url', '^(https?://[^/?#]+).*$', '\1')
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

  SELECT jsonb_agg((e - 'url') || jsonb_build_object('url', public_url, 'hasReferral', has_referral) ORDER BY ord), count(*)
    INTO payload, n
  FROM incoming;
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
                            'referralLinks', i);
END;
$$;

-- ---------------------------------------------------------------------
-- Any signed-in account (the device's anonymous one included): the
-- current catalogue. Passing the version already held returns only
-- {unchanged: true}. Full downloads are counted per account per day and
-- refused past the ceiling; a real device needs one per publish.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_catalog(p_version TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller UUID := auth.uid();
  rel RECORD;
  today_reads INTEGER;
  daily_limit CONSTANT INTEGER := 40;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'NOT_SIGNED_IN: sign in first';
  END IF;
  SELECT version, payload, published_at INTO rel FROM public.catalog_releases ORDER BY id DESC LIMIT 1;
  IF rel.version IS NULL THEN
    RAISE EXCEPTION 'NO_CATALOG: nothing has been published yet';
  END IF;
  IF p_version IS NOT NULL AND p_version = rel.version THEN
    INSERT INTO public.catalog_access (user_id, checks) VALUES (caller, 1)
    ON CONFLICT (user_id, day) DO UPDATE SET checks = catalog_access.checks + 1, last_read_at = now();
    RETURN jsonb_build_object('version', rel.version, 'unchanged', TRUE);
  END IF;
  INSERT INTO public.catalog_access (user_id, full_reads) VALUES (caller, 1)
  ON CONFLICT (user_id, day) DO UPDATE SET full_reads = catalog_access.full_reads + 1, last_read_at = now()
  RETURNING full_reads INTO today_reads;
  IF today_reads > daily_limit AND NOT public.is_owner() THEN
    RAISE EXCEPTION 'RATE_LIMITED: this account has downloaded the catalogue too many times today';
  END IF;
  RETURN jsonb_build_object('version', rel.version, 'publishedAt', rel.published_at, 'platforms', rel.payload);
END;
$$;

-- ---------------------------------------------------------------------
-- Owner only: who is pulling the catalogue, most downloads first. An
-- ordinary device shows one or two full reads and a few dozen checks a
-- day; a scraper shows up as many full reads or many fresh accounts.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.catalog_access_report(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  user_id UUID,
  is_anonymous BOOLEAN,
  email TEXT,
  full_reads BIGINT,
  checks BIGINT,
  days_active BIGINT,
  last_read_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'OWNER_ONLY: only the owner sees catalogue access';
  END IF;
  RETURN QUERY
  SELECT a.user_id, u.is_anonymous, u.email::TEXT,
         sum(a.full_reads)::BIGINT, sum(a.checks)::BIGINT, count(*)::BIGINT, max(a.last_read_at)
  FROM public.catalog_access AS a
  LEFT JOIN auth.users AS u ON u.id = a.user_id
  WHERE a.day >= current_date - GREATEST(COALESCE(p_days, 7), 1) + 1
  GROUP BY a.user_id, u.is_anonymous, u.email
  ORDER BY sum(a.full_reads) DESC, sum(a.checks) DESC
  LIMIT 25;
END;
$$;

-- Owner only: which platform links are being followed, most first.
CREATE OR REPLACE FUNCTION public.link_hits_report(p_days INTEGER DEFAULT 7)
RETURNS TABLE (name TEXT, hits BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'OWNER_ONLY: only the owner sees link hits';
  END IF;
  RETURN QUERY
  SELECT h.name, sum(h.hits)::BIGINT
  FROM public.link_hits AS h
  WHERE h.day >= current_date - GREATEST(COALESCE(p_days, 7), 1) + 1
  GROUP BY h.name
  ORDER BY sum(h.hits) DESC
  LIMIT 50;
END;
$$;

-- For the `go` edge function only (service role): count a follow.
CREATE OR REPLACE FUNCTION public.record_link_hit(p_name TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.link_hits (name, hits) VALUES (p_name, 1)
  ON CONFLICT (name, day) DO UPDATE SET hits = link_hits.hits + 1;
$$;

REVOKE ALL ON FUNCTION public.publish_catalog(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_catalog(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.catalog_access_report(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.link_hits_report(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_link_hit(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_catalog(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_catalog(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.catalog_access_report(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_hits_report(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_link_hit(TEXT) TO service_role;

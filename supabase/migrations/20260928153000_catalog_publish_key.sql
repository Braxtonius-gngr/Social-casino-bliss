-- Lets a merge to main publish data/catalog.json without the admin page.
--
-- The owner still publishes from admin/freebies.html. GitHub Actions now
-- does the same through publish_catalog_with_key(), which takes a publish
-- key instead of the owner's session. Only a SHA-256 hash of each key is
-- stored, in catalog_publish_keys, which no browser role can read; the key
-- itself lives in the repository's CATALOG_PUBLISH_KEY secret. A key can
-- only publish the catalogue - the same checks and writes as the owner's
-- button - and is revoked by deleting its row.
--
-- publish_catalog()'s body moves unchanged into catalog_publish_as(), which
-- is told who published (NULL for a key). publish_catalog() keeps its owner
-- check, signature and grant, so the admin page is untouched.

CREATE TABLE IF NOT EXISTS public.catalog_publish_keys (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
ALTER TABLE public.catalog_publish_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalog_publish_keys FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.catalog_publish_keys_id_seq FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.catalog_publish_as(p_catalog JSONB, p_published_by UUID)
RETURNS JSONB
LANGUAGE plpgsql
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
    VALUES (new_version, payload, n, p_published_by);
    DELETE FROM public.catalog_releases
    WHERE id NOT IN (SELECT id FROM public.catalog_releases ORDER BY id DESC LIMIT 20);
  END IF;
  SELECT count(*) INTO i FROM incoming WHERE has_referral;
  DROP TABLE incoming;
  RETURN jsonb_build_object('version', new_version, 'entries', n, 'changed', latest IS DISTINCT FROM new_version,
                            'referralLinks', i, 'droppedFields', to_jsonb(COALESCE(dropped, ARRAY[]::TEXT[])));
END;
$$;

REVOKE ALL ON FUNCTION public.catalog_publish_as(JSONB, UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.publish_catalog(p_catalog JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'OWNER_ONLY: only the owner publishes the catalogue';
  END IF;
  RETURN public.catalog_publish_as(p_catalog, auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_catalog_with_key(p_key TEXT, p_catalog JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  key_id BIGINT;
BEGIN
  IF p_key IS NULL OR length(p_key) < 32 THEN
    RAISE EXCEPTION 'BAD_KEY: that publish key is not recognised';
  END IF;
  SELECT id INTO key_id FROM public.catalog_publish_keys
  WHERE key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex');
  IF key_id IS NULL THEN
    RAISE EXCEPTION 'BAD_KEY: that publish key is not recognised';
  END IF;
  UPDATE public.catalog_publish_keys SET last_used_at = now() WHERE id = key_id;
  RETURN public.catalog_publish_as(p_catalog, NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.publish_catalog(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_catalog(JSONB) TO authenticated;
REVOKE ALL ON FUNCTION public.publish_catalog_with_key(TEXT, JSONB) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_catalog_with_key(TEXT, JSONB) TO anon;

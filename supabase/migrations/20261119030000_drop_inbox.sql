-- The drop inbox: posts pull-drops reads from the owner's Discord server
-- (channels following casinos' official announcement channels), what Claude
-- read from each, and what was decided. Drops that pass every check in
-- read-drop/gate.ts are published by the function; the rest wait here for the
-- owner. Nothing here is visible to the browser roles except through the
-- owner-only functions below.
--
-- Needs 20261119020000_freebie_notes_private.sql (freebie_notes) first.

CREATE TABLE IF NOT EXISTS public.drop_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'discord',
  -- '<channel id>/<message id>'
  source_ref text NOT NULL,
  posted_at timestamptz,
  content text NOT NULL DEFAULT '',
  image_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'published', 'review', 'rejected', 'skipped', 'error')),
  -- [{ drop, publish, reasons, outcome: 'published'|'held'|'rejected', freebie_id }]
  drafts jsonb NOT NULL DEFAULT '[]'::jsonb,
  unreadable text,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_ref)
);
CREATE INDEX IF NOT EXISTS drop_inbox_status_idx ON public.drop_inbox (status, created_at);

-- Where each channel was read up to.
CREATE TABLE IF NOT EXISTS public.drop_pull_state (
  channel_id text PRIMARY KEY,
  last_message_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.drop_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drop_pull_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.drop_inbox FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.drop_pull_state FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.drop_inbox TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.drop_pull_state TO service_role;

-- Recent inbox entries for the owner panel (held ones first).
CREATE OR REPLACE FUNCTION public.drop_inbox_list(p_limit integer DEFAULT 40)
RETURNS TABLE (
  id uuid,
  status text,
  posted_at timestamptz,
  created_at timestamptz,
  excerpt text,
  image_count integer,
  drafts jsonb,
  unreadable text,
  error text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'OWNER_ONLY';
  END IF;
  RETURN QUERY
  SELECT i.id, i.status, i.posted_at, i.created_at, left(i.content, 400),
         jsonb_array_length(i.image_urls), i.drafts, i.unreadable, i.error
    FROM public.drop_inbox AS i
   WHERE i.status <> 'new'
   ORDER BY (i.status = 'review') DESC, i.created_at DESC
   LIMIT least(greatest(coalesce(p_limit, 40), 1), 100);
END;
$$;

-- Publishes one held drop from an inbox entry; returns the new freebie's id.
CREATE OR REPLACE FUNCTION public.drop_inbox_publish(p_id uuid, p_index integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  entry public.drop_inbox%ROWTYPE;
  draft jsonb;
  d jsonb;
  new_id uuid;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'OWNER_ONLY';
  END IF;
  SELECT * INTO entry FROM public.drop_inbox WHERE drop_inbox.id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  draft := entry.drafts -> p_index;
  IF draft IS NULL OR draft ->> 'outcome' <> 'held' THEN
    RAISE EXCEPTION 'NOT_HELD: that drop is not waiting for review';
  END IF;
  d := draft -> 'drop';

  INSERT INTO public.public_freebies (platform_name, bucket, code, claim_url, root_domain, is_account_tied, terms, expires_at, active)
  VALUES (
    coalesce(nullif(d ->> 'catalog_match', ''), d ->> 'platform_name'),
    d ->> 'bucket',
    nullif(d ->> 'code', ''),
    CASE WHEN (d ->> 'is_account_tied')::boolean THEN NULL ELSE nullif(d ->> 'claim_url', '') END,
    nullif(d ->> 'root_domain', ''),
    coalesce((d ->> 'is_account_tied')::boolean, false),
    nullif(concat_ws(' · ', nullif(d ->> 'reward', ''), nullif(d ->> 'terms', '')), ''),
    nullif(d ->> 'expires_at', '')::timestamptz,
    true
  )
  RETURNING public_freebies.id INTO new_id;

  INSERT INTO public.freebie_notes (freebie_id, note, source, source_ref)
  VALUES (new_id, 'Published from the drop inbox after review', entry.source, entry.source_ref)
  ON CONFLICT (freebie_id) DO NOTHING;

  UPDATE public.drop_inbox
     SET drafts = jsonb_set(drafts, ARRAY[p_index::text],
                            draft || jsonb_build_object('outcome', 'published', 'freebie_id', new_id)),
         updated_at = now()
   WHERE drop_inbox.id = p_id;
  UPDATE public.drop_inbox
     SET status = 'published'
   WHERE drop_inbox.id = p_id
     AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(drafts) AS x WHERE x ->> 'outcome' = 'held');
  RETURN new_id;
END;
$$;

-- Rejects one held drop (p_index) or every held drop in the entry (null).
CREATE OR REPLACE FUNCTION public.drop_inbox_reject(p_id uuid, p_index integer DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  entry public.drop_inbox%ROWTYPE;
  updated jsonb := '[]'::jsonb;
  draft jsonb;
  i integer := 0;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'OWNER_ONLY';
  END IF;
  SELECT * INTO entry FROM public.drop_inbox WHERE drop_inbox.id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  FOR draft IN SELECT value FROM jsonb_array_elements(entry.drafts) LOOP
    IF draft ->> 'outcome' = 'held' AND (p_index IS NULL OR p_index = i) THEN
      draft := draft || jsonb_build_object('outcome', 'rejected');
    END IF;
    updated := updated || jsonb_build_array(draft);
    i := i + 1;
  END LOOP;
  UPDATE public.drop_inbox
     SET drafts = updated,
         status = CASE
           WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(updated) AS x WHERE x ->> 'outcome' = 'held') THEN 'review'
           WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(updated) AS x WHERE x ->> 'outcome' = 'published') THEN 'published'
           ELSE 'rejected' END,
         updated_at = now()
   WHERE drop_inbox.id = p_id;
END;
$$;

-- Takes a published drop off the Freebies tab (kept, inactive).
CREATE OR REPLACE FUNCTION public.drop_inbox_unpublish(p_freebie_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  changed integer;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'OWNER_ONLY';
  END IF;
  UPDATE public.public_freebies SET active = false, updated_at = now() WHERE id = p_freebie_id AND active;
  GET DIAGNOSTICS changed = ROW_COUNT;
  -- Mark it in the inbox entry it came from, so the panel shows it was taken down.
  UPDATE public.drop_inbox AS i
     SET drafts = (
           SELECT jsonb_agg(CASE WHEN x ->> 'freebie_id' = p_freebie_id::text
                                 THEN x || jsonb_build_object('outcome', 'unpublished') ELSE x END
                            ORDER BY n)
             FROM jsonb_array_elements(i.drafts) WITH ORDINALITY AS t(x, n)),
         updated_at = now()
   WHERE i.drafts @> jsonb_build_array(jsonb_build_object('freebie_id', p_freebie_id::text));
  RETURN changed > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.drop_inbox_list(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.drop_inbox_publish(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.drop_inbox_reject(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.drop_inbox_unpublish(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.drop_inbox_list(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.drop_inbox_publish(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.drop_inbox_reject(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.drop_inbox_unpublish(uuid) TO authenticated;

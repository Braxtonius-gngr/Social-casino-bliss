-- Keep where a freebie came from private.
--
-- public_freebies is readable by everyone (anon included) and the app asks
-- for every column, so its source_note column was public: it carried notes
-- like "Discord screenshot, read 9/27/2026" and, in one row, a full claim
-- link with someone's referral code. Notes now live in freebie_notes, which
-- only the admin account can read or write; public_freebies.source_note is
-- emptied and kept empty (to be dropped once no client writes it).

CREATE TABLE IF NOT EXISTS public.freebie_notes (
  freebie_id uuid PRIMARY KEY,
  note text,
  -- Where the drop was pulled from ('discord', 'web', 'manual') and the
  -- message id or page it came from, for the admin's own reference.
  source text,
  source_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.freebie_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.freebie_notes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freebie_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freebie_notes TO service_role;

-- The same admin check as public_freebies' own policies.
DROP POLICY IF EXISTS freebie_notes_admin_all ON public.freebie_notes;
CREATE POLICY freebie_notes_admin_all ON public.freebie_notes
  FOR ALL TO authenticated
  USING (((SELECT auth.jwt()) ->> 'email') = 'johndopamine210@gmail.com')
  WITH CHECK (((SELECT auth.jwt()) ->> 'email') = 'johndopamine210@gmail.com');

-- Copy every existing note, then empty the public column.
INSERT INTO public.freebie_notes (freebie_id, note, source)
SELECT id, source_note,
       CASE WHEN source_note ILIKE '%discord%' OR source_note ~ '^(D\.S\.|SS)\s*-' THEN 'discord' ELSE 'manual' END
  FROM public.public_freebies
 WHERE source_note IS NOT NULL
ON CONFLICT (freebie_id) DO UPDATE SET note = EXCLUDED.note, updated_at = now();

DO $$
DECLARE
  missing integer;
BEGIN
  SELECT count(*) INTO missing
    FROM public.public_freebies AS f
   WHERE f.source_note IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.freebie_notes AS n WHERE n.freebie_id = f.id AND n.note = f.source_note);
  IF missing > 0 THEN
    RAISE EXCEPTION 'freebie_notes copy incomplete (% rows); nothing changed', missing;
  END IF;
END;
$$;

UPDATE public.public_freebies SET source_note = NULL WHERE source_note IS NOT NULL;

-- Any client still writing source_note (an admin page not yet updated) has
-- its note filed privately instead; the public column stays empty.
CREATE OR REPLACE FUNCTION public.public_freebies_divert_note()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.source_note IS NOT NULL THEN
    INSERT INTO public.freebie_notes (freebie_id, note, source)
    VALUES (NEW.id, NEW.source_note, 'manual')
    ON CONFLICT (freebie_id) DO UPDATE SET note = EXCLUDED.note, updated_at = now();
    NEW.source_note := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.public_freebies_divert_note() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS public_freebies_divert_note ON public.public_freebies;
CREATE TRIGGER public_freebies_divert_note
  BEFORE INSERT OR UPDATE OF source_note ON public.public_freebies
  FOR EACH ROW EXECUTE FUNCTION public.public_freebies_divert_note();

-- A deleted freebie takes its note with it.
CREATE OR REPLACE FUNCTION public.public_freebies_drop_note()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.freebie_notes WHERE freebie_id = OLD.id;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.public_freebies_drop_note() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS public_freebies_drop_note ON public.public_freebies;
CREATE TRIGGER public_freebies_drop_note
  AFTER DELETE ON public.public_freebies
  FOR EACH ROW EXECUTE FUNCTION public.public_freebies_drop_note();

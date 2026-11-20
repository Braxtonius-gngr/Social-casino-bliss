-- public.drop_drafts: what the Discord poller (automation-service/discord-pull.js)
-- had read, one row per read-drop call, because the read is the unit of cost.
-- Rows are written by the ingest-drop function on the service role; the owner
-- reads them on the admin page and moves their status. Nothing here publishes:
-- a draft becomes a freebie only when the owner saves it from the form.
--
-- Takes over from drop_inbox, which pull-drops filled and published from;
-- 20261119040100_unschedule_pull_drops.sql stops that job.

CREATE TABLE IF NOT EXISTS public.drop_drafts (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      uuid    NOT NULL,
  source       text    NOT NULL CHECK (source IN ('discord', 'manual', 'email', 'rss', 'app')),
  source_ref   text,
  channel_id   text,
  message_ids  text[]  NOT NULL DEFAULT '{}',
  image_urls   text[]  NOT NULL DEFAULT '{}',
  text         text,
  drops        jsonb   NOT NULL DEFAULT '[]'::jsonb,
  unreadable   text,
  usage        jsonb,
  status       text    NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'loaded', 'published', 'skipped')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  loaded_at    timestamptz,
  published_at timestamptz
);

-- One row per batch: ingest-drop checks this before it spends a read.
CREATE UNIQUE INDEX IF NOT EXISTS drop_drafts_dedupe_idx
  ON public.drop_drafts (user_id, source, source_ref)
  WHERE source_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS drop_drafts_owner_time_idx
  ON public.drop_drafts (user_id, created_at DESC);

ALTER TABLE public.drop_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.drop_drafts FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.drop_drafts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.drop_drafts TO service_role;

DROP POLICY IF EXISTS drop_drafts_owner_select ON public.drop_drafts;
CREATE POLICY drop_drafts_owner_select ON public.drop_drafts
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS drop_drafts_owner_update ON public.drop_drafts;
CREATE POLICY drop_drafts_owner_update ON public.drop_drafts
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- No insert policy on purpose: the service role writes and bypasses RLS.
-- No delete policy or grant on purpose: these rows are the cost ledger.
-- They get skipped, not removed.

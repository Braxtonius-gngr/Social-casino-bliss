-- First-party product analytics: a small, fixed set of funnel events
-- (see trackEvent() in index.html). Clients can only insert their own rows;
-- nobody reads them through the API - queries run from the dashboard or
-- service role (docs/analytics-queries.sql).

CREATE TABLE IF NOT EXISTS public.app_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT CHECK (device_id IS NULL OR char_length(device_id) <= 64),
  name TEXT NOT NULL CHECK (name ~ '^[a-z][a-z0-9_]{1,39}$'),
  props JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (
    jsonb_typeof(props) = 'object' AND pg_column_size(props) <= 2048
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_events_name_created_idx ON public.app_events (name, created_at);
CREATE INDEX IF NOT EXISTS app_events_user_created_idx ON public.app_events (user_id, created_at);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.app_events FROM anon, authenticated;
GRANT INSERT ON TABLE public.app_events TO authenticated;

DROP POLICY IF EXISTS app_events_insert_own ON public.app_events;
CREATE POLICY app_events_insert_own
  ON public.app_events FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

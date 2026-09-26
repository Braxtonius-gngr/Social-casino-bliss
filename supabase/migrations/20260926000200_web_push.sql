-- Background push alerts. The app already computes when each tracked
-- platform comes ready; it uploads that upcoming schedule here, and the
-- web-push edge function (run on a cron) sends a payload-free push to the
-- browser's push service when an entry comes due. No payload means no
-- per-subscription encryption keys are stored: the service worker reads the
-- matching message from its own IndexedDB copy of the schedule.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Only real browser push services: the dispatcher POSTs to this URL, so an
  -- arbitrary host here would turn it into a request relay.
  endpoint TEXT NOT NULL CHECK (
    char_length(endpoint) <= 1024
    AND endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/'
  ),
  -- [{ "at": <epoch ms>, "count": <platforms ready> }, ...], soonest first.
  schedule JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (
    jsonb_typeof(schedule) = 'array' AND jsonb_array_length(schedule) <= 64
  ),
  next_notify_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_due_idx
  ON public.push_subscriptions (next_notify_at)
  WHERE next_notify_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.push_subscriptions_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_subscriptions_touch ON public.push_subscriptions;
CREATE TRIGGER push_subscriptions_touch
  BEFORE INSERT OR UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.push_subscriptions_set_updated_at();

REVOKE EXECUTE ON FUNCTION public.push_subscriptions_set_updated_at() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.push_subscriptions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.push_subscriptions TO authenticated;

DROP POLICY IF EXISTS push_subscriptions_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_own
  ON public.push_subscriptions FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

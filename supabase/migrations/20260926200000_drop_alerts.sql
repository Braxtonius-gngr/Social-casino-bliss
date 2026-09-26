-- New-drop alerts, opt-in, for the platforms a device tracks.
--
-- A device that turns them on uploads the keys of what it tracks
-- ("name:<letters and digits of the platform name>" and "site:<root
-- domain>") alongside its alert schedule. When the admin announces a
-- published drop, the web-push function sends a payload-free push only to
-- the subscriptions whose keys overlap the drop's; the service worker then
-- reads the announced drop from public_freebies (already public) and shows it.

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS drop_alerts BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS drop_keys TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_drop_keys_size;
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_drop_keys_size CHECK (
    cardinality(drop_keys) <= 400
    AND char_length(array_to_string(drop_keys, ',')) <= 16000
  );

CREATE INDEX IF NOT EXISTS push_subscriptions_drop_keys_idx
  ON public.push_subscriptions USING gin (drop_keys)
  WHERE drop_alerts;

-- When a drop was announced. Set once by the web-push function, so a drop
-- can't be pushed twice, and read by the service worker to tell a drop push
-- from a schedule push.
ALTER TABLE public.public_freebies
  ADD COLUMN IF NOT EXISTS announced_at TIMESTAMPTZ;

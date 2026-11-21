-- The Discord pull runs in the cloud: the discord-pull function, called by
-- pg_cron every 5 minutes, reads the source channels and hands each batch of
-- posts to ingest-drop, which files a drop_drafts row. Nothing is published.
--
-- drop_pull_state (from 20261119030000_drop_inbox.sql) keeps where each
-- channel was read up to; it gains the text-only posts waiting for a picture
-- (held) and a lock so two runs never read the same channel at once.

ALTER TABLE public.drop_pull_state ADD COLUMN IF NOT EXISTS held jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.drop_pull_state ADD COLUMN IF NOT EXISTS running_until timestamptz;

-- Claims a channel for one run (p_seconds at most). A channel with no row yet
-- gets one with an empty last_message_id, which means "bookmark, don't read".
CREATE OR REPLACE FUNCTION public.discord_pull_claim(p_channel text, p_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  claimed integer;
BEGIN
  INSERT INTO public.drop_pull_state AS s (channel_id, last_message_id, running_until, updated_at)
  VALUES (p_channel, '', now() + make_interval(secs => p_seconds), now())
  ON CONFLICT (channel_id) DO UPDATE
    SET running_until = EXCLUDED.running_until
    WHERE s.running_until IS NULL OR s.running_until < now();
  GET DIAGNOSTICS claimed = ROW_COUNT;
  RETURN claimed > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.discord_pull_claim(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.discord_pull_claim(text, integer) TO service_role;

-- Every 5 minutes, the same way web-push-dispatch runs: the function checks
-- x-cron-secret against PUSH_CRON_SECRET, read from the vault at call time.
-- Until DISCORD_BOT_TOKEN is set the function answers "not set up yet" and
-- does nothing.
SELECT cron.unschedule('discord-pull') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'discord-pull');
SELECT cron.schedule(
  'discord-pull',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://ewfvyrhlsanzkmozrmhs.supabase.co/functions/v1/discord-pull',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);

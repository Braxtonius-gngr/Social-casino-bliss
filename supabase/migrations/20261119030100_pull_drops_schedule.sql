-- Runs pull-drops every 5 minutes, the same way web-push-dispatch runs
-- web-push: the function checks x-cron-secret against PUSH_CRON_SECRET, and
-- the secret is read from the vault at call time. Apply after pull-drops is
-- deployed and its Discord settings are saved.

SELECT cron.unschedule('pull-drops') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pull-drops');

SELECT cron.schedule(
  'pull-drops',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://ewfvyrhlsanzkmozrmhs.supabase.co/functions/v1/pull-drops',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);

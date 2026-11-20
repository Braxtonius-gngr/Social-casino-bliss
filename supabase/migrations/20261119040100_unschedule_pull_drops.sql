-- Stops pull-drops. It read the owner's Discord channels and published the
-- drops that passed read-drop/gate.ts on its own; the Discord pull now runs
-- through automation-service/discord-pull.js and ingest-drop, which end at a
-- draft row in drop_drafts that the owner checks and saves by hand.
--
-- drop_inbox and its owner functions stay: entries already held there can
-- still be published or rejected from the app's panel. Nothing new arrives.
-- The deployed function itself is removed with
--   supabase functions delete pull-drops

SELECT cron.unschedule('pull-drops') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pull-drops');

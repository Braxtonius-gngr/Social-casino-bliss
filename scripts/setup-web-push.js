#!/usr/bin/env node
/*
 * One-time setup for background push alerts. Generates a VAPID key pair and
 * a cron secret LOCALLY and prints the commands to install them - nothing is
 * written to disk or sent anywhere. Run it once, paste the output, and keep
 * the private key only in Supabase secrets.
 *
 *   node scripts/setup-web-push.js you@example.com
 *
 * The email becomes the VAPID "subject" push services use to contact the
 * sender if something goes wrong. Re-running generates NEW keys, which
 * invalidates every existing browser subscription (users just toggle
 * background alerts back on).
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const email = process.argv[2];
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Usage: node scripts/setup-web-push.js you@example.com');
  process.exit(1);
}

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const supabaseUrl = (html.match(/const SUPABASE_URL = '([^']+)'/) || [])[1];
const anonKey = (html.match(/const SUPABASE_ANON_KEY = '([^']+)'/) || [])[1];
if (!supabaseUrl || !anonKey) {
  console.error('Could not read SUPABASE_URL / SUPABASE_ANON_KEY from index.html.');
  process.exit(1);
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pub = publicKey.export({ format: 'jwk' });
const priv = privateKey.export({ format: 'jwk' });
// Uncompressed point 0x04||x||y: the form browsers take as applicationServerKey.
const vapidPublic = Buffer.concat([
  Buffer.from([4]),
  Buffer.from(pub.x, 'base64url'),
  Buffer.from(pub.y, 'base64url')
]).toString('base64url');
const cronSecret = crypto.randomBytes(32).toString('base64url');

console.log(`
1) Store the secrets (private key and cron secret stay in Supabase only):

supabase secrets set VAPID_PUBLIC_KEY=${vapidPublic} VAPID_PRIVATE_KEY=${priv.d} VAPID_SUBJECT=mailto:${email} PUSH_CRON_SECRET=${cronSecret}

2) Apply the migration and deploy the function:

supabase db push
supabase functions deploy web-push

3) Run this once in the Supabase SQL editor to dispatch due alerts every 5 minutes:

create extension if not exists pg_cron;
create extension if not exists pg_net;
select vault.create_secret('${cronSecret}', 'push_cron_secret');
select cron.schedule(
  'web-push-dispatch',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := '${supabaseUrl}/functions/v1/web-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ${anonKey}',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
`);

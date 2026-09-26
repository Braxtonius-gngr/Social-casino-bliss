-- The app's uid() helper (used for every id in this app - trackedGames,
-- collectionHistory, everything) generates short strings like
-- "id_yar7dm8yd", not real UUIDs. The client was never going to send a
-- UUID here; matching the app's actual id scheme is correct, not the
-- client's own crypto.randomUUID() special-cased for just this table.
alter table public.collection_events alter column id type text;

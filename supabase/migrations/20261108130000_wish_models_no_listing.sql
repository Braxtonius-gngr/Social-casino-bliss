-- The wish-models bucket is public, so its objects are served by URL with no
-- policy at all; the select policy the first migration added only let anyone
-- holding the anon key list the bucket. Nothing needs that. Drop it.

drop policy if exists "wish-models public read" on storage.objects;

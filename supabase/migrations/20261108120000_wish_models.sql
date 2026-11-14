-- Meshes the Wish Room has already had made (lab/wish.html, the wish-3d
-- edge function): one row per normalised prompt and model, pointing at the
-- GLB kept in the wish-models bucket. Only the service role reads or writes
-- the table; the bucket's objects are publicly readable so the browser's
-- GLTFLoader can fetch them plainly.

create table if not exists public.wish_models (
  key        text primary key,          -- normalised prompt | model id
  prompt     text not null,             -- as typed, for the record
  model      text not null,
  path       text not null,             -- object path in the bucket
  url        text not null,             -- public url of that object
  bytes      integer,
  seed       integer,
  created_at timestamptz not null default now()
);

alter table public.wish_models enable row level security;
-- no policies: the service role alone reads and writes it.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wish-models', 'wish-models', true, 52428800, array['model/gltf-binary'])
on conflict (id) do nothing;

-- public read of the bucket's objects; writes come only through the service role.
create policy "wish-models public read" on storage.objects
  for select using (bucket_id = 'wish-models');

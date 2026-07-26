-- Create the storage bucket for logos if it doesn't exist
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Policies for the logos bucket
drop policy if exists "Public Access to Logos" on storage.objects;
create policy "Public Access to Logos"
  on storage.objects for select
  using (bucket_id = 'logos');

drop policy if exists "Authenticated User Upload Logos" on storage.objects;
create policy "Authenticated User Upload Logos"
  on storage.objects for insert
  with check (bucket_id = 'logos' and auth.role() = 'authenticated');

drop policy if exists "Authenticated User Update Logos" on storage.objects;
create policy "Authenticated User Update Logos"
  on storage.objects for update
  using (bucket_id = 'logos' and auth.role() = 'authenticated');

drop policy if exists "Authenticated User Delete Logos" on storage.objects;
create policy "Authenticated User Delete Logos"
  on storage.objects for delete
  using (bucket_id = 'logos' and auth.role() = 'authenticated');

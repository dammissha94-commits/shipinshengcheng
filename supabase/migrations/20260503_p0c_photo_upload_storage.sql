-- P0-C: Photo upload storage bucket with RLS
-- Run in Supabase SQL Editor

-- 1. Create storage bucket for family photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('family-photos', 'family-photos', true, 10485760, '{image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif}')
on conflict (id) do nothing;

-- 2. RLS: anyone can view (bucket is public)
create policy "family_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'family-photos');

-- 3. RLS: authenticated family members can upload
create policy "family_photos_authenticated_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'family-photos'
    and auth.role() = 'authenticated'
  );

-- 4. RLS: uploader can delete their own files
create policy "family_photos_uploader_delete"
  on storage.objects for delete
  using (
    bucket_id = 'family-photos'
    and owner = auth.uid()
  );

-- Phase 4 privacy fix: make family photo storage private.
-- Run in Supabase SQL Editor after the original family-photos bucket migration.
-- This migration does not delete data, disable RLS, or use service_role.

-- 1. Ensure the family photo bucket is private.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'family-photos',
  'family-photos',
  false,
  10485760,
  '{image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif}'
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Replace older broad storage policies.
drop policy if exists "family_photos_public_read" on storage.objects;
drop policy if exists "family_photos_authenticated_upload" on storage.objects;
drop policy if exists "family_photos_uploader_delete" on storage.objects;

drop policy if exists "family_photos_storage_select_family_member" on storage.objects;
drop policy if exists "family_photos_storage_insert_family_member" on storage.objects;
drop policy if exists "family_photos_storage_delete_uploader" on storage.objects;

-- 3. Active family members can read photo objects under their family folder.
create policy "family_photos_storage_select_family_member"
  on storage.objects for select
  using (
    bucket_id = 'family-photos'
    and auth.uid() is not null
    and exists (
      select 1
      from public.family_memberships fm
      where fm.family_id::text = (storage.foldername(name))[1]
        and fm.user_id = auth.uid()
        and fm.join_status = 'active'
    )
  );

-- 4. Active family members can upload only into their family folder.
create policy "family_photos_storage_insert_family_member"
  on storage.objects for insert
  with check (
    bucket_id = 'family-photos'
    and auth.uid() is not null
    and exists (
      select 1
      from public.family_memberships fm
      where fm.family_id::text = (storage.foldername(name))[1]
        and fm.user_id = auth.uid()
        and fm.join_status = 'active'
    )
  );

-- 5. Uploaders can delete their own photo objects.
create policy "family_photos_storage_delete_uploader"
  on storage.objects for delete
  using (
    bucket_id = 'family-photos'
    and owner = auth.uid()
  );

-- =============================================================================
-- YachtWorx v2.0 — Part 2: Storage Bucket & Storage RLS
-- Run this SECOND, AFTER creating the 'documents' bucket in:
--   Supabase Dashboard → Storage → New Bucket
--   Name: documents   Public: OFF (private)
-- =============================================================================

-- Storage RLS: path pattern is "{owner_id}/{boat_id}/{doc_id}/{filename}"
-- foldername(name)[1] extracts the first path segment = owner_id

drop policy if exists "storage: owner upload" on storage.objects;
create policy "storage: owner upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storage: owner read" on storage.objects;
create policy "storage: owner read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storage: owner delete" on storage.objects;
create policy "storage: owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

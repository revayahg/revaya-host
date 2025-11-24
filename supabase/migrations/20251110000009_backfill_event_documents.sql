-- Ensure event_documents table records have consistent metadata required by
-- the unified helpers without relying on non-existent storage columns.

SET statement_timeout TO 0;
SET lock_timeout TO 0;

ALTER TABLE event_documents
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

UPDATE event_documents
SET uploaded_at = COALESCE(uploaded_at, created_at, NOW())
WHERE uploaded_at IS NULL;

-- Try to infer uploaded_by from the storage object owner (when it's a UUID string)
UPDATE event_documents ed
SET uploaded_by = so_owner_uuid::uuid
FROM (
  SELECT name,
         CASE
           WHEN owner::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           THEN owner
           ELSE NULL
         END AS so_owner_uuid
  FROM storage.objects
  WHERE bucket_id = 'event-documents'
) so
WHERE ed.file_path = so.name
  AND ed.uploaded_by IS NULL
  AND so.so_owner_uuid IS NOT NULL;

RESET lock_timeout;
RESET statement_timeout;


-- Normalize event-documents storage object names so that the folder prefix is
-- always a UUID (event_id). This fixes legacy uploads that broke the new
-- storage policies.

SET statement_timeout TO 0;
SET lock_timeout TO 0;

WITH legacy AS (
  SELECT
    id,
    name AS original_name,
    (storage.foldername(name))[1] AS folder_part,
    string_to_array(name, '/') AS path_parts
  FROM storage.objects
  WHERE bucket_id = 'event-documents'
)
UPDATE storage.objects so
SET name = concat(
      public.storage_object_event_id(legacy.original_name)::text,
      '/',
      legacy.path_parts[array_length(legacy.path_parts, 1)]
    )
FROM legacy
WHERE so.id = legacy.id
  AND public.storage_object_event_id(legacy.original_name) IS NOT NULL
  AND (
        legacy.folder_part IS NULL
        OR legacy.folder_part = ''
        OR legacy.folder_part !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      )
  AND so.name <> concat(
        public.storage_object_event_id(legacy.original_name)::text,
        '/',
        legacy.path_parts[array_length(legacy.path_parts, 1)]
      );

RESET lock_timeout;
RESET statement_timeout;


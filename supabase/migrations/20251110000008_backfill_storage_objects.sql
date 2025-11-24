-- Ensure storage.objects records for the event-documents bucket follow the
-- `{eventId}/filename` convention without requiring elevated privileges.

SET statement_timeout TO 0;
SET lock_timeout TO 0;

-- Clean up names that don't follow the `{eventId}/filename` convention by
-- moving them into the default folder using the derived event ID.
WITH legacy AS (
  SELECT id,
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
  AND (
        legacy.folder_part IS NULL
        OR legacy.folder_part = ''
        OR legacy.folder_part !~* '^[0-9a-f-]{36}$'
      )
  AND public.storage_object_event_id(legacy.original_name) IS NOT NULL
  AND so.name <> concat(
        public.storage_object_event_id(legacy.original_name)::text,
        '/',
        legacy.path_parts[array_length(legacy.path_parts, 1)]
      );

RESET lock_timeout;
RESET statement_timeout;


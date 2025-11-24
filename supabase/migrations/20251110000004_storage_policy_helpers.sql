-- Harden storage policies by introducing a helper that safely extracts the
-- event ID from the object path. This prevents casting errors when legacy
-- files do not follow the expected `{eventId}/filename` convention and keeps
-- all storage access routed through the shared event helpers.

SET statement_timeout TO 0;
SET lock_timeout TO 0;

CREATE OR REPLACE FUNCTION public.storage_object_event_id(object_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  folder_name text;
BEGIN
  IF object_name IS NULL THEN
    RETURN NULL;
  END IF;

  folder_name := (storage.foldername(object_name))[1];

  IF folder_name IS NULL OR length(folder_name) = 0 THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN folder_name::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$function$;

-- Rebuild the storage policies to use the helper
DROP POLICY IF EXISTS "Users can view event-documents files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload event-documents files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update event-documents files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete event-documents files" ON storage.objects;

CREATE POLICY "Users can view event-documents files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'event-documents'
  AND public.storage_object_event_id(name) IS NOT NULL
  AND public.can_user_view_event(public.storage_object_event_id(name))
);

CREATE POLICY "Users can upload event-documents files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'event-documents'
  AND public.storage_object_event_id(name) IS NOT NULL
  AND public.can_user_edit_event(public.storage_object_event_id(name))
);

CREATE POLICY "Users can update event-documents files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'event-documents'
  AND public.storage_object_event_id(name) IS NOT NULL
  AND public.can_user_edit_event(public.storage_object_event_id(name))
)
WITH CHECK (
  bucket_id = 'event-documents'
  AND public.storage_object_event_id(name) IS NOT NULL
  AND public.can_user_edit_event(public.storage_object_event_id(name))
);

CREATE POLICY "Users can delete event-documents files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'event-documents'
  AND public.storage_object_event_id(name) IS NOT NULL
  AND public.can_user_edit_event(public.storage_object_event_id(name))
);

RESET lock_timeout;
RESET statement_timeout;


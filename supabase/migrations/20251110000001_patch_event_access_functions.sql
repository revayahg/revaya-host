-- Update helper functions that drive row-level security policies after the
-- security hardening. The previous version only checked event ownership and
-- `event_user_roles`, which caused collaborations based on invitation email
-- (the pre-existing data model) to fail. These helpers now accept both data
-- sources and gracefully handle environments where the roles table has not
-- been backfilled yet.

SET statement_timeout TO 0;
SET lock_timeout TO 0;

CREATE OR REPLACE FUNCTION public.can_user_view_event(target_event uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  current_user uuid := auth.uid();
  current_email text;
BEGIN
  IF current_user IS NULL THEN
    RETURN false;
  END IF;

  SELECT email
    INTO current_email
  FROM auth.users
  WHERE id = current_user;

  RETURN (
    EXISTS (
      SELECT 1
      FROM events e
      WHERE e.id = target_event
        AND (
          e.user_id = current_user
          OR e.created_by = current_user
        )
    )
    OR (
      to_regclass('public.event_user_roles') IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM event_user_roles eur
        WHERE eur.event_id = target_event
          AND eur.user_id = current_user
          AND COALESCE(eur.status, 'active') = 'active'
      )
    )
    OR (
      current_email IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM event_collaborator_invitations ci
        WHERE ci.event_id = target_event
          AND lower(ci.email) = lower(current_email)
          AND ci.status = 'accepted'
      )
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_user_edit_event(target_event uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  current_user uuid := auth.uid();
  current_email text;
BEGIN
  IF current_user IS NULL THEN
    RETURN false;
  END IF;

  SELECT email
    INTO current_email
  FROM auth.users
  WHERE id = current_user;

  RETURN (
    EXISTS (
      SELECT 1
      FROM events e
      WHERE e.id = target_event
        AND (
          e.user_id = current_user
          OR e.created_by = current_user
        )
    )
    OR (
      to_regclass('public.event_user_roles') IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM event_user_roles eur
        WHERE eur.event_id = target_event
          AND eur.user_id = current_user
          AND COALESCE(eur.status, 'active') = 'active'
          AND COALESCE(eur.role, 'viewer') IN ('editor', 'admin', 'owner')
      )
    )
    OR (
      current_email IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM event_collaborator_invitations ci
        WHERE ci.event_id = target_event
          AND lower(ci.email) = lower(current_email)
          AND ci.status = 'accepted'
          AND COALESCE(ci.permission_level, 'viewer') IN ('editor', 'admin', 'owner')
      )
    )
  );
END;
$function$;

-- Reapply the key policies so they pick up the new helper logic.
ALTER TABLE event_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view documents for events they collaborate on" ON event_documents;
DROP POLICY IF EXISTS "Users can insert documents for events they own or edit" ON event_documents;
DROP POLICY IF EXISTS "Users can update documents for events they own or edit" ON event_documents;
DROP POLICY IF EXISTS "Users can delete documents for events they own or edit" ON event_documents;

CREATE POLICY "Users can view documents for events they collaborate on"
ON event_documents
FOR SELECT
USING (public.can_user_view_event(event_id));

CREATE POLICY "Users can insert documents for events they own or edit"
ON event_documents
FOR INSERT
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY "Users can update documents for events they own or edit"
ON event_documents
FOR UPDATE
USING (public.can_user_edit_event(event_id));

CREATE POLICY "Users can delete documents for events they own or edit"
ON event_documents
FOR DELETE
USING (public.can_user_edit_event(event_id));

-- Storage bucket policies depend on the same helpers.
DROP POLICY IF EXISTS "Users can view event-documents files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload event-documents files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update event-documents files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete event-documents files" ON storage.objects;

CREATE POLICY "Users can view event-documents files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'event-documents'
  AND public.can_user_view_event((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Users can upload event-documents files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'event-documents'
  AND public.can_user_edit_event((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Users can update event-documents files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'event-documents'
  AND public.can_user_edit_event((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Users can delete event-documents files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'event-documents'
  AND public.can_user_edit_event((storage.foldername(name))[1]::uuid)
);

-- Staff, tasks, and other tables continue to reference the helper functions,
-- so we rely on those definitions rather than duplicating policy rewrites here.

RESET lock_timeout;
RESET statement_timeout;


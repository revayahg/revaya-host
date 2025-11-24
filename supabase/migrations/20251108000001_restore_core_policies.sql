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

-- Restore critical policies and permissions for collaboration and AI document features
-- This migration is idempotent and can be safely re-run.

-- ============================================================
-- Ensure auth schema privileges (needed for policy subqueries)
-- ============================================================
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO anon;
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON auth.users TO anon;

-- ============================================================
-- Collaborator invitations: ensure read_status column exists
-- ============================================================
ALTER TABLE event_collaborator_invitations
ADD COLUMN IF NOT EXISTS read_status BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_event_collaborator_invitations_read_status
ON event_collaborator_invitations (read_status, email);

UPDATE event_collaborator_invitations
SET read_status = FALSE
WHERE read_status IS NULL;

COMMENT ON COLUMN event_collaborator_invitations.read_status IS
    'Tracks whether the collaborator invitation notification has been read by the invited user';

-- ============================================================
-- Helper predicates for policy checks
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname = 'can_user_view_event'
          AND pg_proc.pronamespace = 'public'::regnamespace
    ) THEN
        CREATE OR REPLACE FUNCTION public.can_user_view_event(target_event uuid)
        RETURNS boolean
        LANGUAGE sql
        STABLE
        AS $f$
            SELECT EXISTS (
                SELECT 1
                FROM events e
                WHERE e.id = target_event
                  AND (
                      e.user_id = auth.uid()
                      OR e.created_by = auth.uid()
                      OR EXISTS (
                          SELECT 1
                          FROM event_user_roles eur
                          WHERE eur.event_id = e.id
                            AND eur.user_id = auth.uid()
                            AND eur.status = 'active'
                      )
                  )
            );
        $f$;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname = 'can_user_edit_event'
          AND pg_proc.pronamespace = 'public'::regnamespace
    ) THEN
        CREATE OR REPLACE FUNCTION public.can_user_edit_event(target_event uuid)
        RETURNS boolean
        LANGUAGE sql
        STABLE
        AS $f$
            SELECT EXISTS (
                SELECT 1
                FROM events e
                WHERE e.id = target_event
                  AND (
                      e.user_id = auth.uid()
                      OR e.created_by = auth.uid()
                      OR EXISTS (
                          SELECT 1
                          FROM event_user_roles eur
                          WHERE eur.event_id = e.id
                            AND eur.user_id = auth.uid()
                            AND eur.status = 'active'
                            AND eur.role IN ('editor', 'admin', 'owner')
                      )
                  )
            );
        $f$;
    END IF;
END
$$;

-- ============================================================
-- event_documents table policies
-- ============================================================
-- ============================================================
-- Storage policies for event-documents bucket
-- ============================================================
DROP POLICY IF EXISTS "Users can view event-documents files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload event-documents files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update event-documents files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete event-documents files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents to events they own or edit" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents from events they collaborate on" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents they uploaded for events they own or edit" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents they uploaded for events they own or edit" ON storage.objects;

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


-- Restore proper RLS policies for event_documents and storage
-- Migration: 20251028000008_restore_proper_rls_policies.sql

-- =============================================
-- EVENT_DOCUMENTS TABLE RLS POLICIES
-- =============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on event_documents" ON event_documents;

-- Create proper role-based policies for event_documents

-- Policy: Users can view documents for events they collaborate on
CREATE POLICY "Users can view documents for events they collaborate on" ON event_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_documents.event_id 
            AND (
                -- Event owner
                events.user_id = auth.uid() OR
                -- Collaborators (all roles can view)
                EXISTS (
                    SELECT 1 FROM event_collaborator_invitations 
                    WHERE event_collaborator_invitations.event_id = events.id 
                    AND event_collaborator_invitations.email = (
                        SELECT email FROM auth.users WHERE id = auth.uid()
                    )
                    AND event_collaborator_invitations.status = 'accepted'
                )
            )
        )
    );

-- Policy: Users can insert documents for events they own or edit
CREATE POLICY "Users can insert documents for events they own or edit" ON event_documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_documents.event_id 
            AND (
                -- Event owner
                events.user_id = auth.uid() OR
                -- Editors only (not viewers)
                EXISTS (
                    SELECT 1 FROM event_collaborator_invitations 
                    WHERE event_collaborator_invitations.event_id = events.id 
                    AND event_collaborator_invitations.email = (
                        SELECT email FROM auth.users WHERE id = auth.uid()
                    )
                    AND event_collaborator_invitations.status = 'accepted'
                    AND event_collaborator_invitations.permission_level IN ('editor', 'owner')
                )
            )
        )
    );

-- Policy: Users can update documents for events they own or edit
CREATE POLICY "Users can update documents for events they own or edit" ON event_documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_documents.event_id 
            AND (
                -- Event owner
                events.user_id = auth.uid() OR
                -- Editors only (not viewers)
                EXISTS (
                    SELECT 1 FROM event_collaborator_invitations 
                    WHERE event_collaborator_invitations.event_id = events.id 
                    AND event_collaborator_invitations.email = (
                        SELECT email FROM auth.users WHERE id = auth.uid()
                    )
                    AND event_collaborator_invitations.status = 'accepted'
                    AND event_collaborator_invitations.permission_level IN ('editor', 'owner')
                )
            )
        )
    );

-- Policy: Users can delete documents for events they own or edit
CREATE POLICY "Users can delete documents for events they own or edit" ON event_documents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_documents.event_id 
            AND (
                -- Event owner
                events.user_id = auth.uid() OR
                -- Editors only (not viewers)
                EXISTS (
                    SELECT 1 FROM event_collaborator_invitations 
                    WHERE event_collaborator_invitations.event_id = events.id 
                    AND event_collaborator_invitations.email = (
                        SELECT email FROM auth.users WHERE id = auth.uid()
                    )
                    AND event_collaborator_invitations.status = 'accepted'
                    AND event_collaborator_invitations.permission_level IN ('editor', 'owner')
                )
            )
        )
    );

-- =============================================
-- STORAGE BUCKET RLS POLICIES
-- =============================================

-- Drop the overly permissive storage policies
DROP POLICY IF EXISTS "Dev allow all insert on storage" ON storage.objects;
DROP POLICY IF EXISTS "Dev allow all select on storage" ON storage.objects;
DROP POLICY IF EXISTS "Dev allow all update on storage" ON storage.objects;
DROP POLICY IF EXISTS "Dev allow all delete on storage" ON storage.objects;

-- Create proper role-based policies for event-documents storage bucket

-- Policy: Users can view files in event-documents bucket for events they collaborate on
CREATE POLICY "Users can view event-documents files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'event-documents' AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = (storage.foldername(name))[1]::uuid
            AND (
                -- Event owner
                events.user_id = auth.uid() OR
                -- Collaborators (all roles can view)
                EXISTS (
                    SELECT 1 FROM event_collaborator_invitations 
                    WHERE event_collaborator_invitations.event_id = events.id 
                    AND event_collaborator_invitations.email = (
                        SELECT email FROM auth.users WHERE id = auth.uid()
                    )
                    AND event_collaborator_invitations.status = 'accepted'
                )
            )
        )
    );

-- Policy: Users can upload files to event-documents bucket for events they own or edit
CREATE POLICY "Users can upload event-documents files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'event-documents' AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = (storage.foldername(name))[1]::uuid
            AND (
                -- Event owner
                events.user_id = auth.uid() OR
                -- Editors only (not viewers)
                EXISTS (
                    SELECT 1 FROM event_collaborator_invitations 
                    WHERE event_collaborator_invitations.event_id = events.id 
                    AND event_collaborator_invitations.email = (
                        SELECT email FROM auth.users WHERE id = auth.uid()
                    )
                    AND event_collaborator_invitations.status = 'accepted'
                    AND event_collaborator_invitations.permission_level IN ('editor', 'owner')
                )
            )
        )
    );

-- Policy: Users can update files in event-documents bucket for events they own or edit
CREATE POLICY "Users can update event-documents files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'event-documents' AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = (storage.foldername(name))[1]::uuid
            AND (
                -- Event owner
                events.user_id = auth.uid() OR
                -- Editors only (not viewers)
                EXISTS (
                    SELECT 1 FROM event_collaborator_invitations 
                    WHERE event_collaborator_invitations.event_id = events.id 
                    AND event_collaborator_invitations.email = (
                        SELECT email FROM auth.users WHERE id = auth.uid()
                    )
                    AND event_collaborator_invitations.status = 'accepted'
                    AND event_collaborator_invitations.permission_level IN ('editor', 'owner')
                )
            )
        )
    );

-- Policy: Users can delete files from event-documents bucket for events they own or edit
CREATE POLICY "Users can delete event-documents files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'event-documents' AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = (storage.foldername(name))[1]::uuid
            AND (
                -- Event owner
                events.user_id = auth.uid() OR
                -- Editors only (not viewers)
                EXISTS (
                    SELECT 1 FROM event_collaborator_invitations 
                    WHERE event_collaborator_invitations.event_id = events.id 
                    AND event_collaborator_invitations.email = (
                        SELECT email FROM auth.users WHERE id = auth.uid()
                    )
                    AND event_collaborator_invitations.status = 'accepted'
                    AND event_collaborator_invitations.permission_level IN ('editor', 'owner')
                )
            )
        )
    );

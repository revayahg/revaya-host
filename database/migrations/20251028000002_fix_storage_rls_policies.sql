-- Fix storage bucket RLS policies for event-documents
-- Migration: 20251028000002_fix_storage_rls_policies.sql

-- Ensure the bucket exists and is private
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'event-documents',
    'event-documents', 
    false,
    10485760, -- 10MB
    ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/svg+xml',
        'image/webp',
        'image/bmp',
        'image/tiff',
        'image/x-icon'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/svg+xml',
        'image/webp',
        'image/bmp',
        'image/tiff',
        'image/x-icon'
    ];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload documents to events they own/edit" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents for events they collab on" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents they uploaded, own or edit" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents - event owner or editor" ON storage.objects;

-- Create RLS policies for storage.objects (event-documents bucket)

-- Policy: Users can upload documents to events they own or have editor permission
CREATE POLICY "Users can upload documents to events they own/edit" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'event-documents' AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id::text = (storage.foldername(name))[1]
            AND (
                events.user_id = auth.uid() OR
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

-- Policy: Users can view documents for events they collaborate on
CREATE POLICY "Users can view documents for events they collab on" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'event-documents' AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id::text = (storage.foldername(name))[1]
            AND (
                events.user_id = auth.uid() OR
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

-- Policy: Users can update documents they uploaded for events they own or edit
CREATE POLICY "Users can update documents they uploaded, own or edit" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'event-documents' AND
        owner = auth.uid() AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id::text = (storage.foldername(name))[1]
            AND (
                events.user_id = auth.uid() OR
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

-- Policy: Users can delete documents for events they own or have editor permission
CREATE POLICY "Users can delete documents - event owner or editor" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'event-documents' AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id::text = (storage.foldername(name))[1]
            AND (
                events.user_id = auth.uid() OR
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

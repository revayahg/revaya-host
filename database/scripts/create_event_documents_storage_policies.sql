-- Storage policies for event-documents bucket
-- This script requires superuser privileges or should be run through Supabase Dashboard
-- 
-- To run through Supabase Dashboard:
-- 1. Go to Supabase Dashboard > Storage > Policies
-- 2. Select the 'event-documents' bucket
-- 3. Add each policy below

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload documents to events they own or edit
CREATE POLICY "Users can upload documents to events they own or edit" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'event-documents' AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = (storage.foldername(name))[1]::uuid
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

-- Policy: Users can view documents from events they collaborate on
CREATE POLICY "Users can view documents from events they collaborate on" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'event-documents' AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = (storage.foldername(name))[1]::uuid
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
CREATE POLICY "Users can update documents they uploaded for events they own or edit" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'event-documents' AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = (storage.foldername(name))[1]::uuid
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

-- Policy: Users can delete documents they uploaded for events they own or edit
CREATE POLICY "Users can delete documents they uploaded for events they own or edit" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'event-documents' AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = (storage.foldername(name))[1]::uuid
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

-- Add comment for documentation
COMMENT ON TABLE storage.objects IS 'Storage objects with RLS policies for event-documents bucket';

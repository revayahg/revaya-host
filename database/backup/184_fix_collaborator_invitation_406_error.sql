-- Fix collaborator invitation 406 error by updating RLS policies
-- This addresses the "Not Acceptable" error when querying invitation tokens

-- First, check current policies on event_collaborator_invitations
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'event_collaborator_invitations';

-- Drop existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Users can view their own invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Allow invitation token queries" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Allow invitation acceptance" ON event_collaborator_invitations;

-- Create simplified policies for collaborator invitations to fix 406 errors
-- Allow anyone to view invitations by token (for invitation acceptance)
CREATE POLICY "view_collaborator_invitations" 
ON event_collaborator_invitations FOR SELECT 
USING (true);

-- Allow anyone to update invitations by token (for invitation acceptance)
CREATE POLICY "update_collaborator_invitations" 
ON event_collaborator_invitations FOR UPDATE 
USING (true);

-- Allow event owners/admins to insert invitations
CREATE POLICY "insert_collaborator_invitations" 
ON event_collaborator_invitations FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM events e 
        WHERE e.id = event_id 
        AND (e.created_by = auth.uid() OR e.user_id = auth.uid())
    )
    OR EXISTS (
        SELECT 1 FROM event_user_roles eur 
        WHERE eur.event_id = event_collaborator_invitations.event_id 
        AND eur.user_id = auth.uid() 
        AND eur.role = 'admin'
    )
);

-- Allow event owners/admins to delete invitations
CREATE POLICY "delete_collaborator_invitations" 
ON event_collaborator_invitations FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM events e 
        WHERE e.id = event_id 
        AND (e.created_by = auth.uid() OR e.user_id = auth.uid())
    )
    OR EXISTS (
        SELECT 1 FROM event_user_roles eur 
        WHERE eur.event_id = event_collaborator_invitations.event_id 
        AND eur.user_id = auth.uid() 
        AND eur.role = 'admin'
    )
);

-- Verify policies are created
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'event_collaborator_invitations';
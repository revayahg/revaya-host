-- Drop existing policies that might reference auth.users incorrectly
DROP POLICY IF EXISTS "Users can view invitations they sent or received" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Event admins can create invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON event_collaborator_invitations;

-- Create new simplified policies
CREATE POLICY "Event participants can view invitations" ON event_collaborator_invitations
    FOR SELECT USING (
        -- Event owners/admins can see all invitations for their events
        EXISTS (
            SELECT 1 FROM event_user_roles 
            WHERE event_id = event_collaborator_invitations.event_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        ) OR
        -- Users who sent the invitation can see it
        invited_by = auth.uid()
    );

CREATE POLICY "Event admins can create invitations" ON event_collaborator_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_user_roles 
            WHERE event_id = event_collaborator_invitations.event_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Allow invitation updates for acceptance" ON event_collaborator_invitations
    FOR UPDATE USING (
        -- Allow updates by invitation sender
        invited_by = auth.uid() OR
        -- Allow updates for invitation acceptance (no user check needed for token-based)
        status = 'pending'
    );

-- Allow public read access for invitation token validation
CREATE POLICY "Public read for invitation tokens" ON event_collaborator_invitations
    FOR SELECT USING (status = 'pending');

-- Ensure the table exists with correct structure
ALTER TABLE event_collaborator_invitations ADD COLUMN IF NOT EXISTS invited_by_name TEXT;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON event_collaborator_invitations TO authenticated;
GRANT USAGE ON SEQUENCE event_collaborator_invitations_id_seq TO authenticated;

-- Create function to safely get user email without accessing auth.users
CREATE OR REPLACE FUNCTION get_user_email()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN auth.email();
END;
$$;

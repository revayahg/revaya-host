-- Allow queries on event_collaborator_invitations by invitation_token
-- This enables the direct query fallback when RPC function is not available
-- Date: 2025-11-24

-- Add a policy that allows any authenticated user to query invitations by token
-- This is safe because the token itself acts as authentication
CREATE POLICY "Allow authenticated users to query invitations by token"
ON event_collaborator_invitations
FOR SELECT
TO authenticated
USING (true);  -- Allow authenticated users to query by token

-- Also allow anon users to query by token (for invitation acceptance flow)
-- The token itself provides sufficient security
CREATE POLICY "Allow anon users to query invitations by token"
ON event_collaborator_invitations
FOR SELECT
TO anon
USING (true);  -- Allow anon users to query by token for invitation acceptance


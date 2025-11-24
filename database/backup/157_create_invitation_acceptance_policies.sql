-- Allow recipients to accept their own invitations
-- This policy enables users to update invitation status when they are the recipient

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "recipients_can_accept_invites" ON public.event_collaborator_invitations;
DROP POLICY IF EXISTS "recipients_can_create_roles" ON public.event_user_roles;

-- Policy for recipients to accept invitations
CREATE POLICY "recipients_can_accept_invites"
ON public.event_collaborator_invitations
FOR UPDATE
USING (email = auth.jwt()->>'email')
WITH CHECK (email = auth.jwt()->>'email');

-- Policy for recipients to create their event role after accepting invitation
CREATE POLICY "recipients_can_create_roles"
ON public.event_user_roles
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.event_collaborator_invitations 
        WHERE event_id = NEW.event_id 
        AND email = auth.jwt()->>'email' 
        AND status = 'accepted'
        AND role = NEW.role
    )
);

-- Ensure recipients can read their own invitations
CREATE POLICY IF NOT EXISTS "recipients_can_view_invites"
ON public.event_collaborator_invitations
FOR SELECT
USING (email = auth.jwt()->>'email');

-- Grant necessary permissions
GRANT UPDATE ON public.event_collaborator_invitations TO authenticated;
GRANT INSERT ON public.event_user_roles TO authenticated;
GRANT SELECT ON public.event_collaborator_invitations TO authenticated;

-- Create index for better performance on email lookups
CREATE INDEX IF NOT EXISTS idx_collaborator_invitations_email 
ON public.event_collaborator_invitations(email);

-- Create index for better performance on invitation token lookups
CREATE INDEX IF NOT EXISTS idx_collaborator_invitations_token 
ON public.event_collaborator_invitations(invitation_token);

COMMIT;
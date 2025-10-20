-- Removed problematic policy that caused infinite recursion
-- Event preview for pending invitees will be handled through separate queries

-- Recipient can accept their invite
CREATE POLICY IF NOT EXISTS "recipient_can_accept_invite"
ON public.event_collaborator_invitations
FOR UPDATE
USING (email = auth.jwt()->>'email')
WITH CHECK (email = auth.jwt()->>'email');

-- Recipient can create their event role after acceptance
CREATE POLICY IF NOT EXISTS "recipient_can_create_event_role"
ON public.event_user_roles
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Allow users to read their own collaborator invitations
CREATE POLICY IF NOT EXISTS "users_can_read_own_invitations"
ON public.event_collaborator_invitations
FOR SELECT
USING (email = auth.jwt()->>'email');
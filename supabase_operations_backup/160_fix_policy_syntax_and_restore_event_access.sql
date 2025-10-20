-- Fix Policy Syntax and Restore Event Access
-- This script fixes the SQL syntax errors and restores basic event access policies

-- First, drop any existing policies that might conflict
DROP POLICY IF EXISTS "recipient_can_accept_invite" ON public.event_collaborator_invitations;
DROP POLICY IF EXISTS "recipient_can_create_event_role" ON public.event_user_roles;
DROP POLICY IF EXISTS "users_can_read_own_invitations" ON public.event_collaborator_invitations;
DROP POLICY IF EXISTS "users_can_read_own_events" ON public.events;
DROP POLICY IF EXISTS "users_can_manage_own_events" ON public.events;

-- Enable RLS on tables if not already enabled
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_collaborator_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_user_roles ENABLE ROW LEVEL SECURITY;

-- Basic event access policies (CRITICAL - users need to see their own events)
CREATE POLICY "users_can_read_own_events"
ON public.events
FOR SELECT
USING (created_by = auth.uid() OR user_id = auth.uid());

CREATE POLICY "users_can_manage_own_events"
ON public.events
FOR ALL
USING (created_by = auth.uid() OR user_id = auth.uid())
WITH CHECK (created_by = auth.uid() OR user_id = auth.uid());

-- Collaborator invitation policies (fixed syntax)
CREATE POLICY "recipient_can_accept_invite"
ON public.event_collaborator_invitations
FOR UPDATE
USING (email = auth.jwt()->>'email')
WITH CHECK (email = auth.jwt()->>'email');

CREATE POLICY "users_can_read_own_invitations"
ON public.event_collaborator_invitations
FOR SELECT
USING (email = auth.jwt()->>'email');

CREATE POLICY "event_owners_can_manage_invitations"
ON public.event_collaborator_invitations
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.events 
        WHERE events.id = event_collaborator_invitations.event_id 
        AND events.created_by = auth.uid()
    )
);

-- Event user roles policies
CREATE POLICY "recipient_can_create_event_role"
ON public.event_user_roles
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_can_read_own_roles"
ON public.event_user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "event_owners_can_manage_roles"
ON public.event_user_roles
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.events 
        WHERE events.id = event_user_roles.event_id 
        AND events.created_by = auth.uid()
    )
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_collaborator_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_user_roles TO authenticated;
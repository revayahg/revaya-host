-- Complete Policy Reset to Fix Infinite Recursion
-- This script removes all problematic policies and creates simple, non-recursive ones

-- Disable RLS temporarily to safely drop policies
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_collaborator_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_user_roles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on events table
DROP POLICY IF EXISTS "event_owners_can_manage_events" ON public.events;
DROP POLICY IF EXISTS "collaborators_can_view_events" ON public.events;
DROP POLICY IF EXISTS "invitees_can_preview_event_basics" ON public.events;
DROP POLICY IF EXISTS "users_can_view_their_events" ON public.events;
DROP POLICY IF EXISTS "users_can_create_events" ON public.events;
DROP POLICY IF EXISTS "users_can_update_their_events" ON public.events;
DROP POLICY IF EXISTS "users_can_delete_their_events" ON public.events;

-- Drop all existing policies on event_collaborator_invitations table
DROP POLICY IF EXISTS "users_can_view_invitations_sent_by_them" ON public.event_collaborator_invitations;
DROP POLICY IF EXISTS "users_can_view_invitations_sent_to_them" ON public.event_collaborator_invitations;
DROP POLICY IF EXISTS "users_can_create_invitations" ON public.event_collaborator_invitations;
DROP POLICY IF EXISTS "users_can_update_invitations" ON public.event_collaborator_invitations;
DROP POLICY IF EXISTS "event_owners_can_manage_invitations" ON public.event_collaborator_invitations;
DROP POLICY IF EXISTS "invited_users_can_accept_invitations" ON public.event_collaborator_invitations;

-- Drop all existing policies on event_user_roles table
DROP POLICY IF EXISTS "users_can_view_their_roles" ON public.event_user_roles;
DROP POLICY IF EXISTS "users_can_create_roles" ON public.event_user_roles;
DROP POLICY IF EXISTS "users_can_update_roles" ON public.event_user_roles;
DROP POLICY IF EXISTS "event_owners_can_manage_roles" ON public.event_user_roles;

-- Create simple, non-recursive policies for events table
CREATE POLICY "events_owner_access" ON public.events
FOR ALL USING (auth.uid() = created_by);

-- Create simple, non-recursive policies for event_collaborator_invitations
CREATE POLICY "invitations_sent_by_user" ON public.event_collaborator_invitations
FOR ALL USING (auth.uid() = invited_by);

CREATE POLICY "invitations_sent_to_user" ON public.event_collaborator_invitations
FOR SELECT USING (auth.jwt()->>'email' = email);

CREATE POLICY "invitations_accept_update" ON public.event_collaborator_invitations
FOR UPDATE USING (
  auth.jwt()->>'email' = email 
  AND status = 'pending'
);

-- Create simple, non-recursive policies for event_user_roles
CREATE POLICY "user_roles_access" ON public.event_user_roles
FOR ALL USING (auth.uid() = user_id);

-- Re-enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_collaborator_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_user_roles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON public.events TO authenticated;
GRANT ALL ON public.event_collaborator_invitations TO authenticated;
GRANT ALL ON public.event_user_roles TO authenticated;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON public.event_collaborator_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.event_collaborator_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.event_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_event_id ON public.event_user_roles(event_id);
-- Fix infinite recursion in event_user_roles table policies
-- This script removes problematic policies and creates simpler, non-recursive ones

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view event roles for events they have access to" ON event_user_roles;
DROP POLICY IF EXISTS "Users can insert event roles for events they own" ON event_user_roles;
DROP POLICY IF EXISTS "Users can update event roles for events they own" ON event_user_roles;
DROP POLICY IF EXISTS "Users can delete event roles for events they own" ON event_user_roles;

-- Create simple, non-recursive policies
-- Allow users to view roles for events they created or are assigned to
CREATE POLICY "event_user_roles_select_policy" ON event_user_roles
    FOR SELECT
    USING (
        -- User can see roles for events they created
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_user_roles.event_id 
            AND events.user_id = auth.uid()
        )
        OR
        -- User can see their own role assignments
        user_id = auth.uid()
    );

-- Allow event creators to insert new roles
CREATE POLICY "event_user_roles_insert_policy" ON event_user_roles
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_user_roles.event_id 
            AND events.user_id = auth.uid()
        )
    );

-- Allow event creators to update roles
CREATE POLICY "event_user_roles_update_policy" ON event_user_roles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_user_roles.event_id 
            AND events.user_id = auth.uid()
        )
    );

-- Allow event creators to delete roles
CREATE POLICY "event_user_roles_delete_policy" ON event_user_roles
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_user_roles.event_id 
            AND events.user_id = auth.uid()
        )
    );

-- Ensure RLS is enabled
ALTER TABLE event_user_roles ENABLE ROW LEVEL SECURITY;

-- Also fix any potential recursion in event_invitations policies
DROP POLICY IF EXISTS "Users can view invitations for events they have access to" ON event_invitations;

-- Create simple invitation view policy
CREATE POLICY "event_invitations_select_policy" ON event_invitations
    FOR SELECT
    USING (
        -- Event creator can see all invitations
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_invitations.event_id 
            AND events.user_id = auth.uid()
        )
        OR
        -- Invited user can see their own invitation
        invited_user_id = auth.uid()
        OR
        -- Vendor can see invitations for their profile
        EXISTS (
            SELECT 1 FROM vendor_profiles vp
            WHERE vp.id = event_invitations.vendor_profile_id
            AND vp.user_id = auth.uid()
        )
    );

-- Ensure RLS is enabled for event_invitations
ALTER TABLE event_invitations ENABLE ROW LEVEL SECURITY;
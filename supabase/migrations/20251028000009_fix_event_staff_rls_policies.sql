-- Fix event_staff RLS policies to properly check ownership and roles
-- Migration: 20251028000009_fix_event_staff_rls_policies.sql

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view staff for events they collaborate on" ON event_staff;
DROP POLICY IF EXISTS "Users can insert staff for events they own or edit" ON event_staff;
DROP POLICY IF EXISTS "Users can update staff for events they own or edit" ON event_staff;
DROP POLICY IF EXISTS "Users can delete staff for events they own or edit" ON event_staff;

-- Policy: Users can view staff for events they collaborate on
CREATE POLICY "Users can view staff for events they collaborate on" ON event_staff
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_staff.event_id 
            AND (
                -- Event owner (check both created_by and user_id)
                events.created_by = auth.uid() OR
                events.user_id = auth.uid() OR
                -- Users with role in event_user_roles
                EXISTS (
                    SELECT 1 FROM event_user_roles
                    WHERE event_user_roles.event_id = events.id
                    AND event_user_roles.user_id = auth.uid()
                    AND event_user_roles.status = 'active'
                ) OR
                -- Collaborators via invitations
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

-- Policy: Users can insert staff for events they own or edit
CREATE POLICY "Users can insert staff for events they own or edit" ON event_staff
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_staff.event_id 
            AND (
                -- Event owner (check both created_by and user_id)
                events.created_by = auth.uid() OR
                events.user_id = auth.uid() OR
                -- Users with owner/editor role in event_user_roles
                EXISTS (
                    SELECT 1 FROM event_user_roles
                    WHERE event_user_roles.event_id = events.id
                    AND event_user_roles.user_id = auth.uid()
                    AND event_user_roles.role IN ('owner', 'editor')
                    AND event_user_roles.status = 'active'
                ) OR
                -- Editors via invitations
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

-- Policy: Users can update staff for events they own or edit
CREATE POLICY "Users can update staff for events they own or edit" ON event_staff
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_staff.event_id 
            AND (
                -- Event owner (check both created_by and user_id)
                events.created_by = auth.uid() OR
                events.user_id = auth.uid() OR
                -- Users with owner/editor role in event_user_roles
                EXISTS (
                    SELECT 1 FROM event_user_roles
                    WHERE event_user_roles.event_id = events.id
                    AND event_user_roles.user_id = auth.uid()
                    AND event_user_roles.role IN ('owner', 'editor')
                    AND event_user_roles.status = 'active'
                ) OR
                -- Editors via invitations
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

-- Policy: Users can delete staff for events they own or edit
CREATE POLICY "Users can delete staff for events they own or edit" ON event_staff
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_staff.event_id 
            AND (
                -- Event owner (check both created_by and user_id)
                events.created_by = auth.uid() OR
                events.user_id = auth.uid() OR
                -- Users with owner/editor role in event_user_roles
                EXISTS (
                    SELECT 1 FROM event_user_roles
                    WHERE event_user_roles.event_id = events.id
                    AND event_user_roles.user_id = auth.uid()
                    AND event_user_roles.role IN ('owner', 'editor')
                    AND event_user_roles.status = 'active'
                ) OR
                -- Editors via invitations
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


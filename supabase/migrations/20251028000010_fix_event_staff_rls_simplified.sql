-- Simplified event_staff RLS policies - prioritize direct ownership
-- Migration: 20251028000010_fix_event_staff_rls_simplified.sql

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view staff for events they collaborate on" ON event_staff;
DROP POLICY IF EXISTS "Users can insert staff for events they own or edit" ON event_staff;
DROP POLICY IF EXISTS "Users can update staff for events they own or edit" ON event_staff;
DROP POLICY IF EXISTS "Users can delete staff for events they own or edit" ON event_staff;

-- Policy: Users can view staff for events they collaborate on
-- Simplified: Check ownership first, then roles/invitations
CREATE POLICY "Users can view staff for events they collaborate on" ON event_staff
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_staff.event_id 
            AND (
                -- Primary check: Direct ownership (either created_by OR user_id)
                (events.created_by = auth.uid() OR events.user_id = auth.uid()) OR
                -- Secondary check: event_user_roles (any status, just check if role exists)
                EXISTS (
                    SELECT 1 FROM event_user_roles
                    WHERE event_user_roles.event_id = events.id
                    AND event_user_roles.user_id = auth.uid()
                ) OR
                -- Tertiary check: Collaborators via invitations
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
                -- Primary check: Direct ownership (either created_by OR user_id)
                (events.created_by = auth.uid() OR events.user_id = auth.uid()) OR
                -- Secondary check: event_user_roles with owner/editor role
                EXISTS (
                    SELECT 1 FROM event_user_roles
                    WHERE event_user_roles.event_id = events.id
                    AND event_user_roles.user_id = auth.uid()
                    AND event_user_roles.role IN ('owner', 'editor')
                ) OR
                -- Tertiary check: Editors via invitations
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
                -- Primary check: Direct ownership (either created_by OR user_id)
                (events.created_by = auth.uid() OR events.user_id = auth.uid()) OR
                -- Secondary check: event_user_roles with owner/editor role
                EXISTS (
                    SELECT 1 FROM event_user_roles
                    WHERE event_user_roles.event_id = events.id
                    AND event_user_roles.user_id = auth.uid()
                    AND event_user_roles.role IN ('owner', 'editor')
                ) OR
                -- Tertiary check: Editors via invitations
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
                -- Primary check: Direct ownership (either created_by OR user_id)
                (events.created_by = auth.uid() OR events.user_id = auth.uid()) OR
                -- Secondary check: event_user_roles with owner/editor role
                EXISTS (
                    SELECT 1 FROM event_user_roles
                    WHERE event_user_roles.event_id = events.id
                    AND event_user_roles.user_id = auth.uid()
                    AND event_user_roles.role IN ('owner', 'editor')
                ) OR
                -- Tertiary check: Editors via invitations
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


-- Fix event_staff RLS policies - Copy EXACT pattern from working tasks table
-- Migration: 20251028000011_fix_event_staff_rls_copy_tasks_pattern.sql

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view staff for events they collaborate on" ON event_staff;
DROP POLICY IF EXISTS "Users can insert staff for events they own or edit" ON event_staff;
DROP POLICY IF EXISTS "Users can update staff for events they own or edit" ON event_staff;
DROP POLICY IF EXISTS "Users can delete staff for events they own or edit" ON event_staff;

-- Copy EXACT pattern from tasks table (which works!)

-- Policy: Users can view staff for events they have access to (same as tasks SELECT)
CREATE POLICY "Users can view staff for events they have access to" ON event_staff
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_user_roles
            WHERE event_id = event_staff.event_id
            AND user_id = auth.uid()
            AND status = 'active'
        )
        OR
        EXISTS (
            SELECT 1 FROM events
            WHERE id = event_staff.event_id
            AND created_by = auth.uid()
        )
    );

-- Policy: Users can create staff for events they have access to (same as tasks INSERT)
CREATE POLICY "Users can create staff for events they have access to" ON event_staff
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_user_roles
            WHERE event_id = event_staff.event_id
            AND user_id = auth.uid()
            AND status = 'active'
            AND role IN ('owner', 'admin', 'editor')
        )
        OR
        EXISTS (
            SELECT 1 FROM events
            WHERE id = event_staff.event_id
            AND created_by = auth.uid()
        )
    );

-- Policy: Users can update staff for events they have access to (same as tasks UPDATE)
CREATE POLICY "Users can update staff for events they have access to" ON event_staff
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM event_user_roles
            WHERE event_id = event_staff.event_id
            AND user_id = auth.uid()
            AND status = 'active'
            AND role IN ('owner', 'admin', 'editor')
        )
        OR
        EXISTS (
            SELECT 1 FROM events
            WHERE id = event_staff.event_id
            AND created_by = auth.uid()
        )
    );

-- Policy: Users can delete staff for events they have access to (same as tasks DELETE)
CREATE POLICY "Users can delete staff for events they have access to" ON event_staff
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM event_user_roles
            WHERE event_id = event_staff.event_id
            AND user_id = auth.uid()
            AND status = 'active'
            AND role IN ('owner', 'admin', 'editor')
        )
        OR
        EXISTS (
            SELECT 1 FROM events
            WHERE id = event_staff.event_id
            AND created_by = auth.uid()
        )
    );


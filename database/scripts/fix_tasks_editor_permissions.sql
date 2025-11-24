-- Fix RLS policies for tasks table to allow editors to create tasks
-- This script ensures editors can create, update, and delete tasks

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view tasks for events they have access to" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks for events they have access to" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks for events they have access to" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks for events they have access to" ON tasks;

-- Create new policies that explicitly allow editors
CREATE POLICY "Users can view tasks for events they have access to" ON tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_user_roles
            WHERE event_id = tasks.event_id
            AND user_id = auth.uid()
            AND status = 'active'
            AND role IN ('owner', 'admin', 'editor', 'viewer')
        )
        OR
        EXISTS (
            SELECT 1 FROM events
            WHERE id = tasks.event_id
            AND (user_id = auth.uid() OR created_by = auth.uid())
        )
    );

CREATE POLICY "Users can create tasks for events they have access to" ON tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_user_roles
            WHERE event_id = tasks.event_id
            AND user_id = auth.uid()
            AND status = 'active'
            AND role IN ('owner', 'admin', 'editor')
        )
        OR
        EXISTS (
            SELECT 1 FROM events
            WHERE id = tasks.event_id
            AND (user_id = auth.uid() OR created_by = auth.uid())
        )
    );

CREATE POLICY "Users can update tasks for events they have access to" ON tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM event_user_roles
            WHERE event_id = tasks.event_id
            AND user_id = auth.uid()
            AND status = 'active'
            AND role IN ('owner', 'admin', 'editor')
        )
        OR
        EXISTS (
            SELECT 1 FROM events
            WHERE id = tasks.event_id
            AND (user_id = auth.uid() OR created_by = auth.uid())
        )
    );

CREATE POLICY "Users can delete tasks for events they have access to" ON tasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM event_user_roles
            WHERE event_id = tasks.event_id
            AND user_id = auth.uid()
            AND status = 'active'
            AND role IN ('owner', 'admin', 'editor')
        )
        OR
        EXISTS (
            SELECT 1 FROM events
            WHERE id = tasks.event_id
            AND (user_id = auth.uid() OR created_by = auth.uid())
        )
    );

-- Ensure RLS is enabled
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

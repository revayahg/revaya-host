-- Restore working RLS policies for tasks table
-- This reverts to the simple policies that were working before

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view tasks for events they have access to" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks for events they have access to" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks for events they have access to" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks for events they have access to" ON tasks;

-- Create simple working policies
CREATE POLICY "Enable read access for event participants" ON tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = tasks.event_id 
            AND events.created_by = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM event_user_roles 
            WHERE event_user_roles.event_id = tasks.event_id 
            AND event_user_roles.user_id = auth.uid()
        )
    );

CREATE POLICY "Enable insert access for event participants" ON tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = tasks.event_id 
            AND events.created_by = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM event_user_roles 
            WHERE event_user_roles.event_id = tasks.event_id 
            AND event_user_roles.user_id = auth.uid()
        )
    );

CREATE POLICY "Enable update access for event participants" ON tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = tasks.event_id 
            AND events.created_by = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM event_user_roles 
            WHERE event_user_roles.event_id = tasks.event_id 
            AND event_user_roles.user_id = auth.uid()
        )
    );

CREATE POLICY "Enable delete access for event participants" ON tasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = tasks.event_id 
            AND events.created_by = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM event_user_roles 
            WHERE event_user_roles.event_id = tasks.event_id 
            AND event_user_roles.user_id = auth.uid()
        )
    );
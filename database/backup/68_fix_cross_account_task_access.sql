-- Fix RLS policies for tasks to allow cross-account access for assigned vendors
DROP POLICY IF EXISTS "Users can view tasks for events they created or are assigned to" ON tasks;

-- Create comprehensive policy that allows:
-- 1. Event creators to see all tasks for their events
-- 2. Vendors to see tasks assigned to them (even from different accounts)
-- 3. Users to modify tasks for their own events
CREATE POLICY "Task access policy" ON tasks
    FOR SELECT USING (
        -- Event creator can see all tasks for their events
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
        OR
        -- Vendors can see tasks assigned to their vendor profiles (cross-account)
        (
            assignee_vendor_id IN (
                SELECT id FROM vendor_profiles WHERE user_id = auth.uid()
            )
            AND visible_to_vendor = true
        )
    );

-- Policy for inserting tasks (only event creators)
DROP POLICY IF EXISTS "Users can insert tasks for their events" ON tasks;
CREATE POLICY "Users can insert tasks for their events" ON tasks
    FOR INSERT WITH CHECK (
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
    );

-- Policy for updating tasks
DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
CREATE POLICY "Users can update tasks" ON tasks
    FOR UPDATE USING (
        -- Event creators can update all tasks for their events
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
        OR
        -- Vendors can update status of tasks assigned to them
        (
            assignee_vendor_id IN (
                SELECT id FROM vendor_profiles WHERE user_id = auth.uid()
            )
            AND visible_to_vendor = true
        )
    );

-- Policy for deleting tasks (only event creators)
DROP POLICY IF EXISTS "Users can delete tasks for their events" ON tasks;
CREATE POLICY "Users can delete tasks for their events" ON tasks
    FOR DELETE USING (
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
    );

-- Add indexes for better performance on cross-account queries
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_vendor_visible 
ON tasks(assignee_vendor_id, visible_to_vendor) 
WHERE visible_to_vendor = true;

CREATE INDEX IF NOT EXISTS idx_tasks_event_assignee 
ON tasks(event_id, assignee_vendor_id);

-- Debug function to check task access
CREATE OR REPLACE FUNCTION debug_task_access(
    p_event_id UUID,
    p_vendor_id UUID
) RETURNS JSON AS $$
DECLARE
    result JSON;
    current_user_id UUID;
    vendor_user_id UUID;
    event_owner UUID;
    task_count INTEGER;
    visible_task_count INTEGER;
BEGIN
    current_user_id := auth.uid();
    
    -- Get vendor's user_id
    SELECT user_id INTO vendor_user_id 
    FROM vendor_profiles 
    WHERE id = p_vendor_id;
    
    -- Get event owner
    SELECT user_id INTO event_owner 
    FROM events 
    WHERE id = p_event_id;
    
    -- Count total tasks for this vendor in this event
    SELECT COUNT(*) INTO task_count
    FROM tasks 
    WHERE event_id = p_event_id 
    AND assignee_vendor_id = p_vendor_id;
    
    -- Count visible tasks
    SELECT COUNT(*) INTO visible_task_count
    FROM tasks 
    WHERE event_id = p_event_id 
    AND assignee_vendor_id = p_vendor_id 
    AND visible_to_vendor = true;
    
    result := json_build_object(
        'current_user', current_user_id,
        'vendor_user_id', vendor_user_id,
        'event_owner', event_owner,
        'event_id', p_event_id,
        'vendor_id', p_vendor_id,
        'total_tasks', task_count,
        'visible_tasks', visible_task_count,
        'is_vendor_user', (current_user_id = vendor_user_id),
        'is_event_owner', (current_user_id = event_owner)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
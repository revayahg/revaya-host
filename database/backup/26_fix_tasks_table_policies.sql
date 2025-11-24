-- Check current policies on tasks table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies WHERE tablename = 'tasks';

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for all users" ON tasks;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks for their events" ON tasks;
DROP POLICY IF EXISTS "Event creators can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Vendors can view their assigned tasks" ON tasks;

-- Create proper policies for tasks table
CREATE POLICY "Event creators can manage all tasks" ON tasks
    FOR ALL USING (
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Vendors can view their assigned tasks" ON tasks
    FOR SELECT USING (
        assignee_vendor_id IN (
            SELECT id FROM vendor_profiles WHERE user_id = auth.uid()
        )
        AND visible_to_vendor = true
    );

-- Make sure RLS is enabled
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON tasks TO authenticated;

-- Completely fix tasks RLS policies with simple approach
-- Remove all existing policies and create basic working ones

-- Drop ALL existing policies on tasks table
DROP POLICY IF EXISTS "Event creators can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Vendors can view assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Vendors can update assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Task creators can manage their tasks" ON tasks;
DROP POLICY IF EXISTS "Enable read access for event participants" ON tasks;
DROP POLICY IF EXISTS "Enable insert access for event participants" ON tasks;
DROP POLICY IF EXISTS "Enable update access for event participants" ON tasks;
DROP POLICY IF EXISTS "Enable delete access for event participants" ON tasks;

-- Temporarily disable RLS to test
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create one simple policy that allows all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON tasks
    FOR ALL USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'tasks' 
AND schemaname = 'public';
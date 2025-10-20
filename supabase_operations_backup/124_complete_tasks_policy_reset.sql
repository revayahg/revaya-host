-- Complete reset of tasks RLS policies
-- This will remove ALL policies and create a single working one

-- First, disable RLS temporarily
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (including the old ones that weren't dropped)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'tasks' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON tasks';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create one simple policy that works
CREATE POLICY "tasks_authenticated_access" ON tasks
    FOR ALL 
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Verify only our new policy exists
SELECT policyname FROM pg_policies 
WHERE tablename = 'tasks' AND schemaname = 'public';
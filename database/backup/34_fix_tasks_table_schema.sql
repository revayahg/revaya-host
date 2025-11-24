-- Add missing columns to tasks table if they don't exist
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS assignee_vendor_id UUID REFERENCES vendor_profiles(id) ON DELETE SET NULL;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS visible_to_vendor BOOLEAN DEFAULT true;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'custom';

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS assigned_to TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_vendor_id ON tasks(assignee_vendor_id);

-- Update RLS policies to include new column
DROP POLICY IF EXISTS "Users can view tasks for events they created or are assigned to" ON tasks;

CREATE POLICY "Users can view tasks for events they created or are assigned to" ON tasks
    FOR SELECT USING (
        -- Event creator can see all tasks
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
        OR
        -- Vendors can see tasks assigned to them
        (
            assignee_vendor_id IN (
                SELECT id FROM vendor_profiles WHERE user_id = auth.uid()
            )
            AND visible_to_vendor = true
        )
    );

-- Verify table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;

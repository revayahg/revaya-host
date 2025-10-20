-- Fix tasks table to ensure proper foreign key relationship with vendor_profiles
-- This addresses the schema cache relationship error

-- First, check if the foreign key constraint exists and add it if missing
DO $$
BEGIN
    -- Check if the foreign key constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_assignee_vendor_id_fkey' 
        AND table_name = 'tasks'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE tasks 
        ADD CONSTRAINT tasks_assignee_vendor_id_fkey 
        FOREIGN KEY (assignee_vendor_id) 
        REFERENCES vendor_profiles(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Foreign key constraint tasks_assignee_vendor_id_fkey added successfully';
    ELSE
        RAISE NOTICE 'Foreign key constraint tasks_assignee_vendor_id_fkey already exists';
    END IF;
END $$;

-- Ensure the assignee_vendor_id column exists and has the correct type
DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'assignee_vendor_id'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE tasks ADD COLUMN assignee_vendor_id UUID REFERENCES vendor_profiles(id) ON DELETE SET NULL;
        RAISE NOTICE 'Column assignee_vendor_id added to tasks table';
    ELSE
        RAISE NOTICE 'Column assignee_vendor_id already exists in tasks table';
    END IF;
END $$;

-- Create index for better performance on vendor task queries
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_vendor_id ON tasks(assignee_vendor_id);

-- Refresh the schema cache to ensure Supabase recognizes the relationship
-- This is done automatically by Supabase, but we can verify the relationship exists
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'tasks'
    AND kcu.column_name = 'assignee_vendor_id';

-- Add comment for documentation
COMMENT ON COLUMN tasks.assignee_vendor_id IS 'Foreign key reference to vendor_profiles.id for task assignment';
COMMENT ON CONSTRAINT tasks_assignee_vendor_id_fkey ON tasks IS 'Ensures assignee_vendor_id references valid vendor profile';

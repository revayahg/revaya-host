-- Add assigned_to column to tasks table for task assignment
-- This column can store either user_id (for collaborators) or free text (for external assignees)

DO $$
BEGIN
    -- Add assigned_to column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'assigned_to'
    ) THEN
        ALTER TABLE tasks ADD COLUMN assigned_to TEXT;
        RAISE NOTICE 'Added assigned_to column to tasks table';
    ELSE
        RAISE NOTICE 'assigned_to column already exists in tasks table';
    END IF;

    -- Add assigned_to_type column to distinguish between user_id and free text
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'assigned_to_type'
    ) THEN
        ALTER TABLE tasks ADD COLUMN assigned_to_type TEXT CHECK (assigned_to_type IN ('user_id', 'free_text')) DEFAULT 'free_text';
        RAISE NOTICE 'Added assigned_to_type column to tasks table';
    ELSE
        RAISE NOTICE 'assigned_to_type column already exists in tasks table';
    END IF;

    -- Add index for better performance on assigned_to queries
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'tasks' AND indexname = 'idx_tasks_assigned_to'
    ) THEN
        CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
        RAISE NOTICE 'Created index on assigned_to column';
    ELSE
        RAISE NOTICE 'Index on assigned_to column already exists';
    END IF;

END $$;
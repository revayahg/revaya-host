-- Add start_date column to tasks table
-- Version 0.1.1-alpha.5: Add optional start date field to tasks

-- Add start_date column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date timestamp with time zone;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);

-- Add comment for documentation
COMMENT ON COLUMN tasks.start_date IS 'Optional start date for the task';

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND table_schema = 'public'
AND column_name = 'start_date';

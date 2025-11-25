-- Migration: Change task status from 'pending' to 'not_started'
-- Date: 2025-01-23
-- Description: Updates all existing tasks with 'pending' status to 'not_started' and updates schema defaults

-- Update existing tasks with 'pending' status to 'not_started'
UPDATE tasks 
SET status = 'not_started' 
WHERE status = 'pending';

-- Update the default value for the status column
ALTER TABLE tasks 
ALTER COLUMN status SET DEFAULT 'not_started';

-- Add comment for documentation
COMMENT ON COLUMN tasks.status IS 'Task status: not_started, in_progress, completed';

-- Verify the changes
SELECT 
    status,
    COUNT(*) as task_count
FROM tasks 
GROUP BY status
ORDER BY status;

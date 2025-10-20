-- Add tasks column to events table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'tasks'
    ) THEN
        ALTER TABLE events ADD COLUMN tasks JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Add comment to describe the column
COMMENT ON COLUMN events.tasks IS 'Array of task objects for the event';

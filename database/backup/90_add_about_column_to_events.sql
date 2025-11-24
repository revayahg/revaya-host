-- Add about column to events table
-- This column will store detailed event descriptions

-- Check if about column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'about'
    ) THEN
        ALTER TABLE events ADD COLUMN about TEXT;
    END IF;
END $$;

-- Add comment to document the column
COMMENT ON COLUMN events.about IS 'Detailed description of the event for vendors and participants';
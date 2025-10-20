-- Add eventSchedule column to events table
-- This column will store the event schedule data as JSON

-- Add the eventSchedule column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'eventSchedule'
    ) THEN
        ALTER TABLE events ADD COLUMN "eventSchedule" JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Also add event_schedule column (snake_case version) for compatibility
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'event_schedule'
    ) THEN
        ALTER TABLE events ADD COLUMN event_schedule JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Update RLS policies to allow access to the new column
DROP POLICY IF EXISTS "Users can view their own events" ON events;
DROP POLICY IF EXISTS "Users can insert their own events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;
DROP POLICY IF EXISTS "Users can delete their own events" ON events;

-- Recreate policies with proper access
CREATE POLICY "Users can view their own events" ON events
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events" ON events
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events" ON events
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events" ON events
FOR DELETE USING (auth.uid() = user_id);

-- Add index for better performance on eventSchedule queries
CREATE INDEX IF NOT EXISTS idx_events_event_schedule ON events USING gin("eventSchedule");
CREATE INDEX IF NOT EXISTS idx_events_event_schedule_snake ON events USING gin(event_schedule);

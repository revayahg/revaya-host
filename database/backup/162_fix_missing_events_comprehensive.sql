-- Comprehensive fix for missing events issue
-- This addresses both existing data and future event creation

-- Step 1: Add created_by column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'created_by') THEN
        ALTER TABLE events ADD COLUMN created_by UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added created_by column to events table';
    ELSE
        RAISE NOTICE 'created_by column already exists';
    END IF;
END $$;

-- Step 2: Backfill created_by with user_id for existing events
UPDATE events 
SET created_by = user_id 
WHERE created_by IS NULL AND user_id IS NOT NULL;

-- Step 3: Set default for created_by to match user_id for new events
ALTER TABLE events ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Step 4: Add index for performance on both user fields
CREATE INDEX IF NOT EXISTS idx_events_user_fields ON events(user_id, created_by);

-- Step 5: Update RLS policies to allow access via either field
DROP POLICY IF EXISTS "Users can view their own events" ON events;
DROP POLICY IF EXISTS "Users can insert their own events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;
DROP POLICY IF EXISTS "Users can delete their own events" ON events;

-- Create comprehensive policies that check both user_id and created_by
CREATE POLICY "Users can view their events via user_id or created_by" ON events
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM event_user_roles 
            WHERE event_id = events.id 
            AND user_id = auth.uid() 
            AND status = 'active'
        )
    );

CREATE POLICY "Users can insert events with proper user fields" ON events
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        (created_by IS NULL OR auth.uid() = created_by)
    );

CREATE POLICY "Users can update their events via user_id or created_by" ON events
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM event_user_roles 
            WHERE event_id = events.id 
            AND user_id = auth.uid() 
            AND role = 'edit'
            AND status = 'active'
        )
    );

CREATE POLICY "Users can delete their events via user_id or created_by" ON events
    FOR DELETE USING (
        auth.uid() = user_id OR 
        auth.uid() = created_by
    );

-- Step 6: Verify the fix worked
DO $$
DECLARE
    missing_created_by_count INTEGER;
    total_events_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_created_by_count 
    FROM events 
    WHERE created_by IS NULL AND user_id IS NOT NULL;
    
    SELECT COUNT(*) INTO total_events_count FROM events;
    
    RAISE NOTICE 'Events missing created_by: % out of % total events', 
                 missing_created_by_count, total_events_count;
    
    IF missing_created_by_count = 0 THEN
        RAISE NOTICE '✓ All events now have created_by field populated';
    ELSE
        RAISE WARNING '⚠ Some events still missing created_by field';
    END IF;
END $$;
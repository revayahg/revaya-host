-- Migration: Backfill created_by column in events table
-- Purpose: Fix events with null created_by values by matching email addresses
-- Date: 2025-01-18

-- Step 1: Verify current state
-- Check how many events have null created_by
SELECT 
    COUNT(*) as total_events,
    COUNT(created_by) as events_with_created_by,
    COUNT(*) - COUNT(created_by) as events_missing_created_by
FROM events;

-- Step 2: Show events that need to be fixed
SELECT 
    id,
    title,
    email,
    created_by,
    created_at
FROM events 
WHERE created_by IS NULL 
ORDER BY created_at DESC;

-- Step 3: Backfill created_by based on email matching
-- This updates events to set created_by using the user ID from auth.users
-- where the email addresses match
UPDATE events 
SET created_by = (
    SELECT auth.users.id 
    FROM auth.users 
    WHERE auth.users.email = events.email
)
WHERE created_by IS NULL 
AND email IS NOT NULL
AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.email = events.email
);

-- Step 4: Verify the fix
-- Check how many events were updated
SELECT 
    COUNT(*) as total_events,
    COUNT(created_by) as events_with_created_by,
    COUNT(*) - COUNT(created_by) as events_still_missing_created_by
FROM events;

-- Step 5: Show any remaining events that couldn't be matched
SELECT 
    id,
    title,
    email,
    created_by,
    'No matching user found' as reason
FROM events 
WHERE created_by IS NULL 
AND email IS NOT NULL;

-- Step 6: Optional - Remove events with no email (orphaned data)
-- Uncomment the following lines if you want to clean up events with no email
-- DELETE FROM events 
-- WHERE created_by IS NULL 
-- AND (email IS NULL OR email = '');

-- Step 7: Add constraint to prevent future null values (optional)
-- Uncomment if you want to enforce created_by to always be set
-- ALTER TABLE events 
-- ALTER COLUMN created_by SET NOT NULL;
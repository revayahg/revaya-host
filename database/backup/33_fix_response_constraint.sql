-- First, let's see what constraints exist
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'event_invitations'::regclass 
AND contype = 'c';

-- Drop all existing check constraints on response column
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'event_invitations'::regclass 
        AND contype = 'c'
        AND consrc LIKE '%response%'
    LOOP
        EXECUTE 'ALTER TABLE event_invitations DROP CONSTRAINT IF EXISTS ' || constraint_name;
    END LOOP;
END $$;

-- Add the correct constraint
ALTER TABLE event_invitations 
ADD CONSTRAINT event_invitations_response_check 
CHECK (response IN ('pending', 'accepted', 'declined'));

-- Update any invalid response values to pending
UPDATE event_invitations 
SET response = 'pending' 
WHERE response NOT IN ('pending', 'accepted', 'declined') 
OR response IS NULL;

-- Verify the constraint is working
SELECT DISTINCT response FROM event_invitations;

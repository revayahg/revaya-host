-- Add response column to event_invitations table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_invitations' 
        AND column_name = 'response'
    ) THEN
        ALTER TABLE event_invitations 
        ADD COLUMN response TEXT DEFAULT 'pending';
    END IF;
END $$;

-- Make event_invitation_link unique if not already
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_event_invitation_link'
    ) THEN
        ALTER TABLE event_invitations 
        ADD CONSTRAINT unique_event_invitation_link 
        UNIQUE (event_invitation_link);
    END IF;
END $$;

-- Add check constraint for response values (using 'accepted' instead of 'confirmed')
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_response_values'
    ) THEN
        ALTER TABLE event_invitations 
        DROP CONSTRAINT check_response_values;
    END IF;
    
    -- Add updated constraint with 'accepted' instead of 'confirmed'
    ALTER TABLE event_invitations 
    ADD CONSTRAINT check_response_values 
    CHECK (response IN ('pending', 'accepted', 'declined'));
END $$;

-- Update any existing 'confirmed' responses to 'accepted'
UPDATE event_invitations 
SET response = 'accepted' 
WHERE response = 'confirmed';

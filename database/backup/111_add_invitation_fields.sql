-- Add missing fields to event_invitations table
-- This script adds the required fields for proper invitation tracking

-- Add requesting_user_id column (who sent the invitation)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'event_invitations' 
                   AND column_name = 'requesting_user_id') THEN
        ALTER TABLE event_invitations 
        ADD COLUMN requesting_user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Add receiving_user_id column (who is receiving the invitation)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'event_invitations' 
                   AND column_name = 'receiving_user_id') THEN
        ALTER TABLE event_invitations 
        ADD COLUMN receiving_user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Add receiving_email column (email address of the invitee)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'event_invitations' 
                   AND column_name = 'receiving_email') THEN
        ALTER TABLE event_invitations 
        ADD COLUMN receiving_email TEXT;
    END IF;
END $$;

-- Add event_name column (name of the event they're being invited to)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'event_invitations' 
                   AND column_name = 'event_name') THEN
        ALTER TABLE event_invitations 
        ADD COLUMN event_name TEXT;
    END IF;
END $$;

-- Add index for better performance on requesting_user_id lookups
CREATE INDEX IF NOT EXISTS idx_event_invitations_requesting_user_id 
ON event_invitations(requesting_user_id);

-- Add index for better performance on receiving_user_id lookups
CREATE INDEX IF NOT EXISTS idx_event_invitations_receiving_user_id 
ON event_invitations(receiving_user_id);

-- Add index for better performance on receiving_email lookups
CREATE INDEX IF NOT EXISTS idx_event_invitations_receiving_email 
ON event_invitations(receiving_email);
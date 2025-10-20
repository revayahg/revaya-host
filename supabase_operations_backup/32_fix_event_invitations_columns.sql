-- Ensure event_invitations table has all required columns
DO $$ 
BEGIN
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_invitations' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE event_invitations 
        ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        
        -- Backfill existing records with current timestamp
        UPDATE event_invitations 
        SET created_at = NOW() 
        WHERE created_at IS NULL;
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_invitations' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE event_invitations 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        
        -- Backfill existing records with current timestamp
        UPDATE event_invitations 
        SET updated_at = NOW() 
        WHERE updated_at IS NULL;
    END IF;

    -- Ensure invite_timestamp exists (this was in the original schema)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_invitations' 
        AND column_name = 'invite_timestamp'
    ) THEN
        ALTER TABLE event_invitations 
        ADD COLUMN invite_timestamp TIMESTAMPTZ DEFAULT NOW();
        
        -- Backfill existing records
        UPDATE event_invitations 
        SET invite_timestamp = NOW() 
        WHERE invite_timestamp IS NULL;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_invitations_created_at 
ON event_invitations(created_at);

CREATE INDEX IF NOT EXISTS idx_event_invitations_updated_at 
ON event_invitations(updated_at);

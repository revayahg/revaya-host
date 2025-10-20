-- Add missing invited_by_name column to event_collaborator_invitations table
-- This fixes the error: column event_collaborator_invitations.invited_by_name does not exist

DO $$ 
BEGIN
    -- Check if the column already exists before adding it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'event_collaborator_invitations' 
        AND column_name = 'invited_by_name'
    ) THEN
        -- Add the invited_by_name column
        ALTER TABLE event_collaborator_invitations 
        ADD COLUMN invited_by_name TEXT;
        
        RAISE NOTICE 'Added invited_by_name column to event_collaborator_invitations table';
    ELSE
        RAISE NOTICE 'Column invited_by_name already exists in event_collaborator_invitations table';
    END IF;
END $$;

-- Optional: Update existing records with a default value if needed
-- UPDATE event_collaborator_invitations 
-- SET invited_by_name = 'System' 
-- WHERE invited_by_name IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'event_collaborator_invitations' 
AND column_name = 'invited_by_name';
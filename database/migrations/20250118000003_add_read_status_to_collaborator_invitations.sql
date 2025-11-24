-- Add read_status column to event_collaborator_invitations table
-- This allows tracking whether a collaborator invitation notification has been read

ALTER TABLE event_collaborator_invitations 
ADD COLUMN IF NOT EXISTS read_status BOOLEAN DEFAULT FALSE;

-- Add an index for better performance when querying unread invitations
CREATE INDEX IF NOT EXISTS idx_event_collaborator_invitations_read_status 
ON event_collaborator_invitations(read_status, email);

-- Update existing invitations to be marked as unread (since they haven't been read yet)
UPDATE event_collaborator_invitations 
SET read_status = FALSE 
WHERE read_status IS NULL;

-- Add a comment to document the column
COMMENT ON COLUMN event_collaborator_invitations.read_status IS 'Tracks whether the collaborator invitation notification has been read by the invited user';

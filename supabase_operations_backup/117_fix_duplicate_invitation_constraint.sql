-- Fix duplicate invitation constraint issue
-- Run this script to resolve the "duplicate key value violates unique constraint" error

-- Step 1: Drop the old constraint if it exists
ALTER TABLE event_collaborator_invitations DROP CONSTRAINT IF EXISTS unique_pending_invitation;

-- Step 2: Add the new partial index for pending invitations only
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invitation 
ON event_collaborator_invitations (event_id, email) 
WHERE status = 'pending';

-- Step 3: Update the invitation function to handle existing pending invitations
CREATE OR REPLACE FUNCTION send_collaborator_invitation(
    p_event_id UUID,
    p_email TEXT,
    p_permission_level TEXT DEFAULT 'viewer'
) RETURNS JSON AS $$
DECLARE
    v_invitation_id UUID;
    v_invitation_token TEXT;
BEGIN
    -- First, cancel any existing pending invitations for this email/event
    UPDATE event_collaborator_invitations 
    SET status = 'expired', updated_at = NOW()
    WHERE event_id = p_event_id AND email = p_email AND status = 'pending';

    -- Create new invitation
    INSERT INTO event_collaborator_invitations (
        event_id, invited_by, email, permission_level
    ) VALUES (
        p_event_id, auth.uid(), p_email, p_permission_level
    ) RETURNING id, invitation_token INTO v_invitation_id, v_invitation_token;

    RETURN json_build_object(
        'invitation_id', v_invitation_id,
        'invitation_token', v_invitation_token
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
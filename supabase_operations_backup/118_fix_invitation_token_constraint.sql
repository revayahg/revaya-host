-- Fix the invitation token null constraint error
-- The issue is that the invitation_token column has a NOT NULL constraint 
-- but the function isn't properly generating it

-- Step 1: Check current table structure and fix if needed
ALTER TABLE event_collaborator_invitations 
ALTER COLUMN invitation_token SET DEFAULT gen_random_uuid()::text;

-- Step 2: Update the function to explicitly generate invitation_token
CREATE OR REPLACE FUNCTION send_collaborator_invitation(
    p_event_id UUID,
    p_email TEXT,
    p_permission_level TEXT DEFAULT 'viewer'
) RETURNS JSON AS $$
DECLARE
    v_invitation_id UUID;
    v_invitation_token TEXT;
    v_event_name TEXT;
    v_inviter_name TEXT;
BEGIN
    -- Check if user has permission to invite
    IF NOT EXISTS (
        SELECT 1 FROM events WHERE id = p_event_id AND created_by = auth.uid()
        UNION
        SELECT 1 FROM event_user_roles WHERE event_id = p_event_id AND user_id = auth.uid() AND role IN ('admin', 'can_edit')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to invite collaborators';
    END IF;

    -- Get event details
    SELECT name INTO v_event_name FROM events WHERE id = p_event_id;
    
    -- Get inviter name
    SELECT COALESCE(
        raw_user_meta_data->>'full_name', 
        raw_user_meta_data->>'name',
        email
    ) INTO v_inviter_name 
    FROM auth.users WHERE id = auth.uid();

    -- Generate unique invitation token
    v_invitation_token := gen_random_uuid()::text;

    -- First, expire any existing pending invitations for this email/event
    UPDATE event_collaborator_invitations 
    SET status = 'expired', updated_at = NOW()
    WHERE event_id = p_event_id AND email = p_email AND status = 'pending';

    -- Create new invitation with explicit token
    INSERT INTO event_collaborator_invitations (
        event_id, 
        invited_by, 
        email, 
        permission_level,
        invitation_token,
        status,
        expires_at,
        created_at,
        updated_at
    ) VALUES (
        p_event_id, 
        auth.uid(), 
        p_email, 
        p_permission_level,
        v_invitation_token,
        'pending',
        NOW() + INTERVAL '7 days',
        NOW(),
        NOW()
    ) RETURNING id INTO v_invitation_id;

    -- Return complete invitation details
    RETURN json_build_object(
        'invitation_id', v_invitation_id,
        'invitation_token', v_invitation_token,
        'event_name', COALESCE(v_event_name, 'Unknown Event'),
        'inviter_name', COALESCE(v_inviter_name, 'Unknown User'),
        'email', p_email,
        'permission_level', p_permission_level,
        'success', true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
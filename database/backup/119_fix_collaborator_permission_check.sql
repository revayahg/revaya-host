-- Fix permission check in collaborator invitation function
-- The current permission check is too restrictive and doesn't account for event ownership properly

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
    v_user_can_invite BOOLEAN := FALSE;
BEGIN
    -- Check if user is event owner OR has admin/edit permissions
    SELECT EXISTS (
        -- Check if user is event owner (using user_id or created_by)
        SELECT 1 FROM events 
        WHERE id = p_event_id 
        AND (user_id = auth.uid() OR created_by = auth.uid())
        
        UNION
        
        -- Check if user has admin or edit role
        SELECT 1 FROM event_user_roles 
        WHERE event_id = p_event_id 
        AND user_id = auth.uid() 
        AND role IN ('admin', 'can_edit')
        AND status = 'active'
    ) INTO v_user_can_invite;

    IF NOT v_user_can_invite THEN
        RAISE EXCEPTION 'You do not have permission to invite collaborators to this event';
    END IF;

    -- Get event details
    SELECT name INTO v_event_name FROM events WHERE id = p_event_id;
    
    -- Get inviter name from profiles table first, then fallback to auth.users
    SELECT COALESCE(
        (SELECT CONCAT(first_name, ' ', last_name) FROM profiles WHERE id = auth.uid()),
        (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = auth.uid()),
        (SELECT email FROM auth.users WHERE id = auth.uid())
    ) INTO v_inviter_name;

    -- Generate unique invitation token
    v_invitation_token := gen_random_uuid()::text;

    -- First, expire any existing pending invitations for this email/event
    UPDATE event_collaborator_invitations 
    SET status = 'expired', updated_at = NOW()
    WHERE event_id = p_event_id AND email = p_email AND status = 'pending';

    -- Create new invitation
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
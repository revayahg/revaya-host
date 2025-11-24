-- Create the send_collaborator_invitation function
-- This function creates a collaborator invitation and returns invitation details

CREATE OR REPLACE FUNCTION public.send_collaborator_invitation(
    p_event_id UUID,
    p_email TEXT,
    p_permission_level TEXT
) RETURNS JSON AS $$
DECLARE
    v_invitation_token TEXT;
    v_event_name TEXT;
    v_inviter_name TEXT;
    v_invitation_id UUID;
    v_result JSON;
BEGIN
    -- Generate unique invitation token
    v_invitation_token := encode(gen_random_bytes(32), 'base64');
    
    -- Get event name
    SELECT name INTO v_event_name 
    FROM events 
    WHERE id = p_event_id;
    
    -- Get inviter name (current user) - use first_name and last_name from profiles table
    SELECT COALESCE(
        TRIM(CONCAT(p.first_name, ' ', p.last_name)), 
        p.email, 
        u.email
    ) INTO v_inviter_name
    FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    WHERE u.id = auth.uid();
    
    -- Insert invitation
    INSERT INTO event_collaborator_invitations (
        event_id,
        email,
        permission_level,
        invitation_token,
        invited_by,
        status
    ) VALUES (
        p_event_id,
        p_email,
        p_permission_level,
        v_invitation_token,
        auth.uid(),
        'pending'
    ) RETURNING id INTO v_invitation_id;
    
    -- Build result JSON
    v_result := json_build_object(
        'invitation_id', v_invitation_id,
        'invitation_token', v_invitation_token,
        'event_name', COALESCE(v_event_name, 'Event'),
        'inviter_name', COALESCE(v_inviter_name, 'Someone'),
        'email', p_email,
        'permission_level', p_permission_level,
        'status', 'pending'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to create invitation: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.send_collaborator_invitation(UUID, TEXT, TEXT) TO authenticated;
-- Phase 2: Email Invitation System Fix
-- Standardize URL parameters and improve invitation handling

-- Create helper function to get event details for email invitations
-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS get_event_invitation_details(uuid);
DROP FUNCTION IF EXISTS validate_invitation_token(text);
DROP FUNCTION IF EXISTS send_collaborator_invitation(uuid, text, text);

CREATE OR REPLACE FUNCTION get_event_invitation_details(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_details jsonb;
BEGIN
    SELECT jsonb_build_object(
        'id', e.id,
        'name', COALESCE(e.title, e.name, 'Untitled Event'),
        'description', e.description,
        'start_date', e.start_date,
        'location', e.location,
        'owner_name', COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Event Organizer')
    )
    FROM events e
    LEFT JOIN profiles p ON e.user_id = p.id
    WHERE e.id = p_event_id
    INTO v_event_details;
    
    RETURN COALESCE(v_event_details, '{}'::jsonb);
END;
$$;

-- Create function to validate invitation tokens
CREATE OR REPLACE FUNCTION validate_invitation_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitation jsonb;
BEGIN
    SELECT jsonb_build_object(
        'valid', true,
        'invitation_id', eci.id,
        'event_id', eci.event_id,
        'email', eci.email,
        'role', eci.role,
        'status', eci.status,
        'expires_at', eci.expires_at,
        'event_details', get_event_invitation_details(eci.event_id)
    )
    FROM event_collaborator_invitations eci
    WHERE eci.invitation_token = p_token
    AND eci.status = 'pending'
    AND eci.expires_at > now()
    INTO v_invitation;
    
    IF v_invitation IS NULL THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Invalid, expired, or already processed invitation'
        );
    END IF;
    
    RETURN v_invitation;
END;
$$;

-- Update the send_collaborator_invitation function to include more context
CREATE OR REPLACE FUNCTION send_collaborator_invitation(
    p_event_id uuid,
    p_email text,
    p_role text DEFAULT 'viewer'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitation_id uuid;
    v_token text;
    v_event_exists boolean;
    v_user_can_invite boolean;
    v_inviter_name text;
    v_event_details jsonb;
BEGIN
    -- Check if event exists
    SELECT EXISTS(SELECT 1 FROM events WHERE id = p_event_id) INTO v_event_exists;
    
    IF NOT v_event_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event not found');
    END IF;
    
    -- Check if user can invite (event owner or admin/editor)
    SELECT EXISTS(
        SELECT 1 FROM events WHERE id = p_event_id AND user_id = auth.uid()
        UNION
        SELECT 1 FROM event_user_roles 
        WHERE event_id = p_event_id 
        AND user_id = auth.uid() 
        AND role IN ('admin', 'editor')
        AND status = 'active'
    ) INTO v_user_can_invite;
    
    IF NOT v_user_can_invite THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;
    
    -- Check if invitation already exists for this email and event
    IF EXISTS(
        SELECT 1 FROM event_collaborator_invitations 
        WHERE event_id = p_event_id 
        AND email = p_email 
        AND status = 'pending'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation already exists for this email');
    END IF;
    
    -- Get inviter name
    SELECT COALESCE(first_name || ' ' || last_name, email, 'Event Organizer')
    FROM profiles WHERE id = auth.uid()
    INTO v_inviter_name;
    
    -- Get event details
    SELECT get_event_invitation_details(p_event_id) INTO v_event_details;
    
    -- Generate new invitation
    v_invitation_id := gen_random_uuid();
    v_token := gen_random_uuid()::text;
    
    -- Insert invitation with inviter name
    INSERT INTO event_collaborator_invitations (
        id,
        event_id,
        invited_by,
        email,
        role,
        invitation_token,
        status,
        expires_at,
        created_at,
        invited_by_name
    ) VALUES (
        v_invitation_id,
        p_event_id,
        auth.uid(),
        p_email,
        p_role,
        v_token,
        'pending',
        now() + interval '7 days',
        now(),
        v_inviter_name
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'invitation_id', v_invitation_id,
        'token', v_token,
        'event_details', v_event_details,
        'inviter_name', v_inviter_name
    );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_event_invitation_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invitation_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION send_collaborator_invitation(uuid, text, text) TO authenticated;
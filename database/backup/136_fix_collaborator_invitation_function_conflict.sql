-- Fix collaborator invitation function conflict
-- Remove all existing versions and create a single clean function

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS public.send_collaborator_invitation(uuid, text, text);
DROP FUNCTION IF EXISTS public.send_collaborator_invitation(uuid, text, text, text);

-- Create a single, clean version of the function
CREATE OR REPLACE FUNCTION public.send_collaborator_invitation(
    p_event_id UUID,
    p_email TEXT,
    p_permission_level TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitation_id UUID;
    v_token TEXT;
    v_inviter_name TEXT;
    v_event_title TEXT;
    v_existing_invitation UUID;
BEGIN
    -- Validate permission level
    IF p_permission_level NOT IN ('editor', 'viewer') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid permission level'
        );
    END IF;

    -- Get inviter name and event title
    SELECT 
        COALESCE(p.full_name, p.email, 'Event Organizer') as inviter_name,
        e.title as event_title
    INTO v_inviter_name, v_event_title
    FROM events e
    LEFT JOIN profiles p ON p.id = auth.uid()
    WHERE e.id = p_event_id;

    IF v_event_title IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Event not found'
        );
    END IF;

    -- Check for existing invitation
    SELECT id INTO v_existing_invitation
    FROM event_collaborator_invitations
    WHERE event_id = p_event_id 
    AND email = p_email 
    AND status = 'pending';

    IF v_existing_invitation IS NOT NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invitation already exists for this email'
        );
    END IF;

    -- Generate unique token
    v_token := encode(gen_random_bytes(32), 'hex');
    v_invitation_id := gen_random_uuid();

    -- Insert invitation
    INSERT INTO event_collaborator_invitations (
        id,
        event_id,
        email,
        permission_level,
        invited_by,
        invited_by_name,
        invitation_token,
        status,
        created_at,
        expires_at
    ) VALUES (
        v_invitation_id,
        p_event_id,
        p_email,
        p_permission_level,
        auth.uid(),
        v_inviter_name,
        v_token,
        'pending',
        NOW(),
        NOW() + INTERVAL '7 days'
    );

    -- Return success with invitation details
    RETURN json_build_object(
        'success', true,
        'invitation_id', v_invitation_id,
        'token', v_token,
        'inviter_name', v_inviter_name,
        'event_title', v_event_title
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.send_collaborator_invitation(UUID, TEXT, TEXT) TO authenticated;
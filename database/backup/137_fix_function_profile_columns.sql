-- Fix the send_collaborator_invitation function to use correct profiles table columns
-- The error occurs because the function references p.full_name which doesn't exist

-- Drop the existing function
DROP FUNCTION IF EXISTS public.send_collaborator_invitation(UUID, TEXT, TEXT);

-- Create the corrected function using first_name and last_name
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

    -- Get inviter name and event title using correct column names
    SELECT 
        COALESCE(
            CASE 
                WHEN p.first_name IS NOT NULL AND p.last_name IS NOT NULL 
                THEN TRIM(p.first_name || ' ' || p.last_name)
                WHEN p.first_name IS NOT NULL 
                THEN p.first_name
                WHEN p.last_name IS NOT NULL 
                THEN p.last_name
                ELSE p.email
            END,
            u.email,
            'Event Organizer'
        ) as inviter_name,
        COALESCE(e.name, e.title, 'Event') as event_title
    INTO v_inviter_name, v_event_title
    FROM events e
    LEFT JOIN auth.users u ON u.id = auth.uid()
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
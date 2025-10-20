-- Create event_collaborator_invitations table for email invitations
CREATE TABLE IF NOT EXISTS event_collaborator_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    permission_level TEXT NOT NULL CHECK (permission_level IN ('view_only', 'can_edit')),
    invitation_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint to prevent duplicate pending invitations only
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invitation 
ON event_collaborator_invitations (event_id, email) 
WHERE status = 'pending';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collaborator_invitations_event_id ON event_collaborator_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_collaborator_invitations_email ON event_collaborator_invitations(email);
CREATE INDEX IF NOT EXISTS idx_collaborator_invitations_token ON event_collaborator_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_collaborator_invitations_status ON event_collaborator_invitations(status);

-- Enable RLS
ALTER TABLE event_collaborator_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view invitations for their events" ON event_collaborator_invitations
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM events WHERE created_by = auth.uid()
            UNION
            SELECT event_id FROM event_user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'can_edit')
        )
    );

CREATE POLICY "Users can create invitations for their events" ON event_collaborator_invitations
    FOR INSERT WITH CHECK (
        event_id IN (
            SELECT id FROM events WHERE created_by = auth.uid()
            UNION
            SELECT event_id FROM event_user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'can_edit')
        )
    );

CREATE POLICY "Users can update invitations for their events" ON event_collaborator_invitations
    FOR UPDATE USING (
        event_id IN (
            SELECT id FROM events WHERE created_by = auth.uid()
            UNION
            SELECT event_id FROM event_user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'can_edit')
        )
    );

-- Function to send collaborator invitation
CREATE OR REPLACE FUNCTION send_collaborator_invitation(
    p_event_id UUID,
    p_email TEXT,
    p_permission_level TEXT
) RETURNS JSON AS $$
DECLARE
    v_invitation_id UUID;
    v_invitation_token TEXT;
    v_event_name TEXT;
    v_inviter_name TEXT;
    v_result JSON;
BEGIN
    -- Check if user has permission to invite
    IF NOT EXISTS (
        SELECT 1 FROM events WHERE id = p_event_id AND created_by = auth.uid()
        UNION
        SELECT 1 FROM event_user_roles WHERE event_id = p_event_id AND user_id = auth.uid() AND role IN ('admin', 'can_edit')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to invite collaborators';
    END IF;

    -- Get event and inviter details
    SELECT name INTO v_event_name FROM events WHERE id = p_event_id;
    SELECT COALESCE(full_name, email) INTO v_inviter_name 
    FROM auth.users WHERE id = auth.uid();

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

    -- Return invitation details for email sending
    SELECT json_build_object(
        'invitation_id', v_invitation_id,
        'invitation_token', v_invitation_token,
        'event_name', v_event_name,
        'inviter_name', v_inviter_name,
        'email', p_email,
        'permission_level', p_permission_level
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION accept_collaborator_invitation(
    p_invitation_token TEXT
) RETURNS JSON AS $$
DECLARE
    v_invitation RECORD;
    v_existing_role TEXT;
    v_result JSON;
BEGIN
    -- Get invitation details
    SELECT * INTO v_invitation 
    FROM event_collaborator_invitations 
    WHERE invitation_token = p_invitation_token 
    AND status = 'pending' 
    AND expires_at > NOW();

    IF v_invitation IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;

    -- Check if user is already a collaborator
    SELECT role INTO v_existing_role 
    FROM event_user_roles 
    WHERE event_id = v_invitation.event_id AND user_id = auth.uid();

    IF v_existing_role IS NOT NULL THEN
        -- Update existing role if permission level is higher
        IF (v_existing_role = 'view_only' AND v_invitation.permission_level = 'can_edit') THEN
            UPDATE event_user_roles 
            SET role = v_invitation.permission_level,
                updated_at = NOW()
            WHERE event_id = v_invitation.event_id AND user_id = auth.uid();
        END IF;
    ELSE
        -- Add new collaborator
        INSERT INTO event_user_roles (event_id, user_id, role)
        VALUES (v_invitation.event_id, auth.uid(), v_invitation.permission_level);
    END IF;

    -- Mark invitation as accepted
    UPDATE event_collaborator_invitations 
    SET status = 'accepted',
        accepted_at = NOW(),
        accepted_by = auth.uid(),
        updated_at = NOW()
    WHERE id = v_invitation.id;

    -- Return event details
    SELECT json_build_object(
        'event_id', v_invitation.event_id,
        'permission_level', v_invitation.permission_level,
        'success', true
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get invitation details (public access for signup flow)
CREATE OR REPLACE FUNCTION get_invitation_details(
    p_invitation_token TEXT
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'event_name', e.name,
        'event_id', e.id,
        'permission_level', ci.permission_level,
        'inviter_name', COALESCE(u.raw_user_meta_data->>'full_name', u.email),
        'valid', ci.status = 'pending' AND ci.expires_at > NOW()
    ) INTO v_result
    FROM event_collaborator_invitations ci
    JOIN events e ON e.id = ci.event_id
    JOIN auth.users u ON u.id = ci.invited_by
    WHERE ci.invitation_token = p_invitation_token;

    RETURN COALESCE(v_result, '{"valid": false}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
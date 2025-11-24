-- CRITICAL FIX: Role constraint mismatch
-- The issue: event_collaborator_invitations table allows 'admin' role but collaborators should only be 'viewer' or 'editor'
-- Event owners (planners) are 'admin' and should NOT be invited as collaborators

-- 1. First, update any existing invalid data
UPDATE event_collaborator_invitations 
SET role = 'viewer' 
WHERE role = 'admin';

-- 2. Drop the existing constraint that allows admin
ALTER TABLE event_collaborator_invitations 
DROP CONSTRAINT IF EXISTS valid_collaborator_role;

-- 3. Add the correct constraint - NO ADMIN ALLOWED for collaborator invitations
ALTER TABLE event_collaborator_invitations 
ADD CONSTRAINT valid_collaborator_role 
CHECK (role IN ('viewer', 'editor'));

-- 4. Update the invitation function to prevent admin role invitations
CREATE OR REPLACE FUNCTION send_collaborator_invitation(
    p_event_id UUID,
    p_email TEXT,
    p_role TEXT DEFAULT 'viewer',
    p_invited_by UUID DEFAULT NULL,
    p_invited_by_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitation_token UUID;
    v_existing_invitation_id UUID;
    v_result JSON;
BEGIN
    -- CRITICAL: Validate role - ONLY viewer/editor allowed for collaborators
    -- Event owners (planners) are admin and should NOT be invited as collaborators
    IF p_role NOT IN ('viewer', 'editor') THEN
        RAISE EXCEPTION 'Invalid role: %. Collaborators can only be viewer or editor. Event owners are admin and cannot be invited as collaborators.', p_role;
    END IF;
    
    -- Check if invitation already exists
    SELECT id INTO v_existing_invitation_id
    FROM event_collaborator_invitations
    WHERE event_id = p_event_id AND email = p_email AND status = 'pending';
    
    IF v_existing_invitation_id IS NOT NULL THEN
        -- Update existing invitation
        UPDATE event_collaborator_invitations
        SET role = p_role,
            invited_by = COALESCE(p_invited_by, auth.uid()),
            invited_by_name = p_invited_by_name,
            created_at = NOW()
        WHERE id = v_existing_invitation_id;
        
        v_invitation_token := (SELECT invitation_token FROM event_collaborator_invitations WHERE id = v_existing_invitation_id);
    ELSE
        -- Create new invitation
        v_invitation_token := gen_random_uuid();
        
        INSERT INTO event_collaborator_invitations (
            event_id, email, role, invitation_token, status,
            invited_by, invited_by_name, created_at
        ) VALUES (
            p_event_id, p_email, p_role, v_invitation_token, 'pending',
            COALESCE(p_invited_by, auth.uid()), p_invited_by_name, NOW()
        );
    END IF;
    
    v_result := json_build_object(
        'invitation_token', v_invitation_token,
        'email', p_email,
        'role', p_role,
        'status', 'pending'
    );
    
    RETURN v_result;
END;
$$;
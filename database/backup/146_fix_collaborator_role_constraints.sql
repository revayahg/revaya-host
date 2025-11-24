-- Fix collaborator role constraints to enforce proper role structure
-- Event owners have 'admin' role, collaborators can only have 'viewer' or 'editor'

-- Update any invalid roles in existing data
UPDATE event_user_roles 
SET role = 'viewer' 
WHERE role NOT IN ('admin', 'viewer', 'editor');

-- Update invitation constraints
UPDATE event_collaborator_invitations 
SET role = 'viewer' 
WHERE role NOT IN ('viewer', 'editor');

-- Add check constraints to prevent invalid roles
DO $$ 
BEGIN 
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'valid_collaborator_role' 
        AND table_name = 'event_collaborator_invitations'
    ) THEN
        ALTER TABLE event_collaborator_invitations DROP CONSTRAINT valid_collaborator_role;
    END IF;
    
    -- Add new constraint for invitations (only viewer/editor allowed)
    ALTER TABLE event_collaborator_invitations 
    ADD CONSTRAINT valid_collaborator_role 
    CHECK (role IN ('viewer', 'editor'));
    
    -- Drop existing constraint if it exists for user roles
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'valid_user_role' 
        AND table_name = 'event_user_roles'
    ) THEN
        ALTER TABLE event_user_roles DROP CONSTRAINT valid_user_role;
    END IF;
    
    -- Add constraint for user roles (admin for owners, viewer/editor for collaborators)
    ALTER TABLE event_user_roles 
    ADD CONSTRAINT valid_user_role 
    CHECK (role IN ('admin', 'viewer', 'editor'));
END $$;

-- Update the send_collaborator_invitation function to enforce role constraints
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
    -- Validate role (only viewer/editor allowed for collaborators)
    IF p_role NOT IN ('viewer', 'editor') THEN
        RAISE EXCEPTION 'Invalid role. Collaborators can only be viewer or editor.';
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
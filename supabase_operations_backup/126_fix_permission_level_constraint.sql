-- Fix permission level constraint to match frontend values
-- The frontend sends 'viewer' and 'editor' but the constraint expects 'view_only' and 'can_edit'

-- Drop the existing constraint
ALTER TABLE event_collaborator_invitations 
DROP CONSTRAINT IF EXISTS event_collaborator_invitations_permission_level_check;

-- Add new constraint with correct values
ALTER TABLE event_collaborator_invitations 
ADD CONSTRAINT event_collaborator_invitations_permission_level_check 
CHECK (permission_level IN ('viewer', 'editor'));

-- Update any existing records to use new values
UPDATE event_collaborator_invitations 
SET permission_level = CASE 
    WHEN permission_level = 'view_only' THEN 'viewer'
    WHEN permission_level = 'can_edit' THEN 'editor'
    ELSE permission_level
END;

-- Also update the event_user_roles table constraint if it exists
ALTER TABLE event_user_roles 
DROP CONSTRAINT IF EXISTS event_user_roles_role_check;

ALTER TABLE event_user_roles 
ADD CONSTRAINT event_user_roles_role_check 
CHECK (role IN ('admin', 'viewer', 'editor'));

-- Update any existing records in event_user_roles
UPDATE event_user_roles 
SET role = CASE 
    WHEN role = 'view_only' THEN 'viewer'
    WHEN role = 'can_edit' THEN 'editor'
    ELSE role
END;
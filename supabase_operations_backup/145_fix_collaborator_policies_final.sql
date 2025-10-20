-- Fix Collaborator System Database Policies and Relationships
-- This script fixes infinite recursion and permission errors

-- 1. Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view event roles they participate in" ON event_user_roles;
DROP POLICY IF EXISTS "Users can view collaborator invitations for their events" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Users can view their own pending invitations" ON event_collaborator_invitations;

-- 2. Create simple, non-recursive policies for event_user_roles
CREATE POLICY "event_user_roles_select" ON event_user_roles
FOR SELECT USING (
  -- User can see roles for events they own
  event_id IN (
    SELECT id FROM events WHERE created_by = auth.uid()
  )
  OR
  -- User can see their own role
  user_id = auth.uid()
);

CREATE POLICY "event_user_roles_insert" ON event_user_roles
FOR INSERT WITH CHECK (
  -- Only event owners can add roles
  event_id IN (
    SELECT id FROM events WHERE created_by = auth.uid()
  )
);

CREATE POLICY "event_user_roles_update" ON event_user_roles
FOR UPDATE USING (
  -- Only event owners can update roles
  event_id IN (
    SELECT id FROM events WHERE created_by = auth.uid()
  )
);

CREATE POLICY "event_user_roles_delete" ON event_user_roles
FOR DELETE USING (
  -- Only event owners can delete roles
  event_id IN (
    SELECT id FROM events WHERE created_by = auth.uid()
  )
);

-- 3. Create simple policies for event_collaborator_invitations
CREATE POLICY "collaborator_invitations_select" ON event_collaborator_invitations
FOR SELECT USING (
  -- Event owners can see all invitations for their events
  event_id IN (
    SELECT id FROM events WHERE created_by = auth.uid()
  )
  OR
  -- Users can see invitations sent to their email
  email = auth.email()
);

CREATE POLICY "collaborator_invitations_insert" ON event_collaborator_invitations
FOR INSERT WITH CHECK (
  -- Only event owners can create invitations
  event_id IN (
    SELECT id FROM events WHERE created_by = auth.uid()
  )
);

CREATE POLICY "collaborator_invitations_update" ON event_collaborator_invitations
FOR UPDATE USING (
  -- Event owners can update invitations
  event_id IN (
    SELECT id FROM events WHERE created_by = auth.uid()
  )
  OR
  -- Invited users can update their own invitations (for acceptance)
  email = auth.email()
);

-- 4. Ensure proper foreign key relationships exist
ALTER TABLE event_user_roles 
DROP CONSTRAINT IF EXISTS event_user_roles_event_id_fkey;

ALTER TABLE event_user_roles 
ADD CONSTRAINT event_user_roles_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_user_roles_event_id ON event_user_roles(event_id);
CREATE INDEX IF NOT EXISTS idx_event_user_roles_user_id ON event_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_event_collaborator_invitations_event_id ON event_collaborator_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_collaborator_invitations_email ON event_collaborator_invitations(email);

-- 6. Ensure invitation_token column exists and has unique constraint
ALTER TABLE event_collaborator_invitations 
ADD COLUMN IF NOT EXISTS invitation_token UUID DEFAULT gen_random_uuid();

-- Create unique constraint on invitation_token if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'event_collaborator_invitations_invitation_token_key'
  ) THEN
    ALTER TABLE event_collaborator_invitations 
    ADD CONSTRAINT event_collaborator_invitations_invitation_token_key 
    UNIQUE (invitation_token);
  END IF;
END $$;

-- 7. Update any existing invitations without tokens
UPDATE event_collaborator_invitations 
SET invitation_token = gen_random_uuid() 
WHERE invitation_token IS NULL;

-- 8. Make invitation_token NOT NULL
ALTER TABLE event_collaborator_invitations 
ALTER COLUMN invitation_token SET NOT NULL;

-- 9. Ensure proper role constraints
ALTER TABLE event_user_roles 
DROP CONSTRAINT IF EXISTS event_user_roles_role_check;

ALTER TABLE event_user_roles 
ADD CONSTRAINT event_user_roles_role_check 
CHECK (role IN ('admin', 'editor', 'viewer'));

ALTER TABLE event_collaborator_invitations 
DROP CONSTRAINT IF EXISTS event_collaborator_invitations_role_check;

ALTER TABLE event_collaborator_invitations 
ADD CONSTRAINT event_collaborator_invitations_role_check 
CHECK (role IN ('admin', 'editor', 'viewer'));

-- 10. Create function to safely get user profile info (avoiding recursion)
CREATE OR REPLACE FUNCTION get_user_profile_safe(user_id_param UUID)
RETURNS TABLE(email TEXT, first_name TEXT, last_name TEXT, display_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(p.email, au.email) as email,
    p.first_name,
    p.last_name,
    COALESCE(
      CASE 
        WHEN p.first_name IS NOT NULL AND p.last_name IS NOT NULL 
        THEN p.first_name || ' ' || p.last_name
        WHEN p.first_name IS NOT NULL 
        THEN p.first_name
        ELSE COALESCE(p.email, au.email)
      END,
      COALESCE(p.email, au.email)
    ) as display_name
  FROM auth.users au
  LEFT JOIN profiles p ON p.id = au.id
  WHERE au.id = user_id_param;
END;
$$;
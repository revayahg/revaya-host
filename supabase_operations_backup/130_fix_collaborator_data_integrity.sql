-- Fix Collaborator Data Integrity and Add Constraints
-- Run this script to clean up existing duplicate data and prevent future issues

-- Step 1: Clean up duplicate event_user_roles entries
WITH duplicate_roles AS (
  SELECT 
    event_id, 
    user_id, 
    MIN(created_at) as first_created,
    COUNT(*) as duplicate_count
  FROM event_user_roles 
  GROUP BY event_id, user_id 
  HAVING COUNT(*) > 1
)
DELETE FROM event_user_roles 
WHERE (event_id, user_id) IN (
  SELECT event_id, user_id FROM duplicate_roles
) 
AND created_at NOT IN (
  SELECT first_created FROM duplicate_roles 
  WHERE duplicate_roles.event_id = event_user_roles.event_id 
  AND duplicate_roles.user_id = event_user_roles.user_id
);

-- Step 2: Add unique constraint to prevent duplicate collaborator entries
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_event_user_role'
  ) THEN
    ALTER TABLE event_user_roles 
    ADD CONSTRAINT unique_event_user_role 
    UNIQUE (event_id, user_id, status);
  END IF;
END $$;

-- Step 3: Clean up orphaned invitation entries (invitations without events)
DELETE FROM event_collaborator_invitations 
WHERE event_id NOT IN (SELECT id FROM events);

-- Step 4: Fix accepted invitations missing event_user_roles entries
INSERT INTO event_user_roles (event_id, user_id, role, status, created_at, updated_at)
SELECT DISTINCT
  eci.event_id,
  eci.accepted_by as user_id,
  COALESCE(eci.permission_level, 'editor') as role,
  'active' as status,
  eci.accepted_at as created_at,
  NOW() as updated_at
FROM event_collaborator_invitations eci
WHERE eci.status = 'accepted' 
  AND eci.accepted_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM event_user_roles eur 
    WHERE eur.event_id = eci.event_id 
    AND eur.user_id = eci.accepted_by
  );

-- Step 5: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_event_user_roles_event_user 
ON event_user_roles(event_id, user_id) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_event_collaborator_invitations_status 
ON event_collaborator_invitations(status, event_id) 
WHERE status IN ('pending', 'accepted');

CREATE INDEX IF NOT EXISTS idx_event_user_roles_user_active 
ON event_user_roles(user_id) 
WHERE status = 'active';

-- Step 6: Update RLS policies for better performance
DROP POLICY IF EXISTS "Users can view event collaborators" ON event_user_roles;
CREATE POLICY "Users can view event collaborators" ON event_user_roles
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM event_user_roles eur2 
      WHERE eur2.event_id = event_user_roles.event_id 
      AND eur2.user_id = auth.uid() 
      AND eur2.status = 'active'
    )
  );

-- Step 7: Add data validation constraints
ALTER TABLE event_collaborator_invitations 
ADD CONSTRAINT valid_permission_level 
CHECK (permission_level IN ('viewer', 'editor', 'admin'));

ALTER TABLE event_user_roles 
ADD CONSTRAINT valid_role 
CHECK (role IN ('owner', 'admin', 'editor', 'viewer'));

ALTER TABLE event_user_roles 
ADD CONSTRAINT valid_status 
CHECK (status IN ('active', 'inactive', 'pending'));

-- Step 8: Create function to get user collaborative events efficiently
CREATE OR REPLACE FUNCTION get_user_collaborative_events(user_uuid UUID)
RETURNS TABLE (
  event_id UUID,
  event_name TEXT,
  event_description TEXT,
  event_date DATE,
  event_location TEXT,
  user_role TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    e.id as event_id,
    e.name as event_name,
    e.description as event_description,
    e.date as event_date,
    e.location as event_location,
    eur.role as user_role,
    eur.created_at
  FROM events e
  INNER JOIN event_user_roles eur ON e.id = eur.event_id
  WHERE eur.user_id = user_uuid 
    AND eur.status = 'active'
  ORDER BY eur.created_at DESC;
END;
$$;
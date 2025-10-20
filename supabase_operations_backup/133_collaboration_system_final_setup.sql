-- Final Collaboration System Setup
-- This script combines the essential fixes and optimizations

-- Step 1: Clean up duplicate event_user_roles entries (safer approach)
WITH duplicate_roles AS (
  SELECT 
    event_id, 
    user_id, 
    MIN(id) as keep_id,
    COUNT(*) as duplicate_count
  FROM event_user_roles 
  WHERE status = 'active'
  GROUP BY event_id, user_id 
  HAVING COUNT(*) > 1
)
DELETE FROM event_user_roles 
WHERE id NOT IN (
  SELECT keep_id FROM duplicate_roles
) 
AND (event_id, user_id) IN (
  SELECT event_id, user_id FROM duplicate_roles
);

-- Step 2: Add unique constraint to prevent future duplicates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_event_user_active_role'
  ) THEN
    ALTER TABLE event_user_roles 
    ADD CONSTRAINT unique_event_user_active_role 
    UNIQUE (event_id, user_id) 
    WHERE status = 'active';
  END IF;
END $$;

-- Step 3: Fix accepted invitations missing event_user_roles entries
INSERT INTO event_user_roles (event_id, user_id, role, status, created_at, updated_at)
SELECT DISTINCT
  eci.event_id,
  eci.accepted_by as user_id,
  COALESCE(eci.permission_level, 'editor') as role,
  'active' as status,
  COALESCE(eci.accepted_at, eci.created_at) as created_at,
  NOW() as updated_at
FROM event_collaborator_invitations eci
WHERE eci.status = 'accepted' 
  AND eci.accepted_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM event_user_roles eur 
    WHERE eur.event_id = eci.event_id 
    AND eur.user_id = eci.accepted_by
    AND eur.status = 'active'
  );

-- Step 4: Create optimized function for getting user collaborative events
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

-- Step 5: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_event_user_roles_user_active 
ON event_user_roles(user_id, status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_event_user_roles_event_active 
ON event_user_roles(event_id, status) 
WHERE status = 'active';

-- Step 6: Create function for collaboration system health check
CREATE OR REPLACE FUNCTION collaborator_system_health_check()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details TEXT,
  count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check 1: Missing role entries for accepted invitations
  RETURN QUERY
  SELECT 
    'missing_role_entries'::TEXT as check_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
    'Accepted invitations without event_user_roles entries'::TEXT as details,
    COUNT(*)::INTEGER as count
  FROM event_collaborator_invitations eci
  LEFT JOIN event_user_roles eur ON eci.event_id = eur.event_id AND eci.accepted_by = eur.user_id AND eur.status = 'active'
  WHERE eci.status = 'accepted' AND eci.accepted_by IS NOT NULL AND eur.id IS NULL;

  -- Check 2: Duplicate role entries
  RETURN QUERY
  SELECT 
    'duplicate_role_entries'::TEXT as check_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
    'Duplicate active event_user_roles entries'::TEXT as details,
    COUNT(*)::INTEGER as count
  FROM (
    SELECT event_id, user_id, COUNT(*) as dup_count
    FROM event_user_roles 
    WHERE status = 'active'
    GROUP BY event_id, user_id 
    HAVING COUNT(*) > 1
  ) duplicates;

  -- Check 3: System performance
  RETURN QUERY
  SELECT 
    'system_performance'::TEXT as check_name,
    'INFO'::TEXT as status,
    'Total active collaborators in system'::TEXT as details,
    COUNT(*)::INTEGER as count
  FROM event_user_roles 
  WHERE status = 'active';
END;
$$;

-- Step 7: Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_collaborative_events(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION collaborator_system_health_check() TO authenticated;

-- Step 8: Update RLS policies for better security
DROP POLICY IF EXISTS "Users can view event collaborators" ON event_user_roles;
CREATE POLICY "Users can view event collaborators" ON event_user_roles
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = event_user_roles.event_id 
      AND e.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_user_roles eur2 
      WHERE eur2.event_id = event_user_roles.event_id 
      AND eur2.user_id = auth.uid() 
      AND eur2.status = 'active'
    )
  );

COMMENT ON FUNCTION get_user_collaborative_events IS 'Efficiently retrieves all events where a user is a collaborator';
COMMENT ON FUNCTION collaborator_system_health_check IS 'Validates collaboration system integrity and performance';
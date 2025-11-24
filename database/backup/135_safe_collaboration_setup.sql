-- Safe Collaboration System Setup
-- Run this AFTER script 134 has fixed role constraints

-- Step 1: Clean up duplicate event_user_roles entries safely
WITH ranked_roles AS (
  SELECT 
    id,
    event_id,
    user_id,
    role,
    status,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY event_id, user_id, status 
      ORDER BY created_at DESC
    ) as rn
  FROM event_user_roles 
  WHERE status = 'active'
),
duplicates_to_remove AS (
  SELECT id FROM ranked_roles WHERE rn > 1
)
DELETE FROM event_user_roles 
WHERE id IN (SELECT id FROM duplicates_to_remove);

-- Step 2: Add unique constraint safely
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_event_user_active_role'
  ) THEN
    ALTER TABLE event_user_roles DROP CONSTRAINT unique_event_user_active_role;
  END IF;
  
  -- Add the constraint using partial unique index
  CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS unique_event_user_active_role 
  ON event_user_roles (event_id, user_id) 
  WHERE status = 'active';
  
  RAISE NOTICE 'Unique constraint added successfully';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Constraint addition failed: %', SQLERRM;
END $$;

-- Step 3: Create optimized RPC function
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

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION get_user_collaborative_events(UUID) TO authenticated;

-- Step 5: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_event_user_roles_user_active 
ON event_user_roles(user_id, status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_event_user_roles_event_active 
ON event_user_roles(event_id, status) 
WHERE status = 'active';

-- Step 6: Final validation
SELECT 
  'Setup Complete' as status,
  COUNT(*) as total_active_roles,
  COUNT(DISTINCT event_id) as events_with_collaborators,
  COUNT(DISTINCT user_id) as users_with_roles
FROM event_user_roles 
WHERE status = 'active';
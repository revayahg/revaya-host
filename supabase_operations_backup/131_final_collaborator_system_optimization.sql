-- Final Collaborator System Optimization
-- Performance improvements and monitoring setup

-- Step 1: Create materialized view for fast collaborator lookups
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_event_access AS
SELECT DISTINCT
  eur.user_id,
  eur.event_id,
  eur.role,
  e.name as event_name,
  e.date as event_date,
  eur.created_at as joined_at,
  eur.status
FROM event_user_roles eur
JOIN events e ON eur.event_id = e.id
WHERE eur.status = 'active';

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_event_access_unique 
ON mv_user_event_access (user_id, event_id);

-- Step 2: Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_user_event_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_event_access;
END;
$$;

-- Step 3: Create trigger to auto-refresh materialized view
CREATE OR REPLACE FUNCTION trigger_refresh_user_event_access()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh the materialized view after any changes
  PERFORM refresh_user_event_access();
  RETURN NULL;
END;
$$;

-- Add triggers (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'refresh_user_access_on_role_change'
  ) THEN
    CREATE TRIGGER refresh_user_access_on_role_change
      AFTER INSERT OR UPDATE OR DELETE ON event_user_roles
      FOR EACH STATEMENT
      EXECUTE FUNCTION trigger_refresh_user_event_access();
  END IF;
END $$;

-- Step 4: Create monitoring table for collaboration metrics
CREATE TABLE IF NOT EXISTS collaboration_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_date DATE DEFAULT CURRENT_DATE,
  total_collaborators INTEGER DEFAULT 0,
  active_invitations INTEGER DEFAULT 0,
  events_with_collaborators INTEGER DEFAULT 0,
  avg_collaborators_per_event NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Create function to update collaboration metrics
CREATE OR REPLACE FUNCTION update_collaboration_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
  total_collabs INTEGER;
  active_invites INTEGER;
  events_with_collabs INTEGER;
  avg_collabs NUMERIC(5,2);
BEGIN
  -- Calculate metrics
  SELECT COUNT(DISTINCT user_id) INTO total_collabs
  FROM event_user_roles WHERE status = 'active';
  
  SELECT COUNT(*) INTO active_invites
  FROM event_collaborator_invitations WHERE status = 'pending';
  
  SELECT COUNT(DISTINCT event_id) INTO events_with_collabs
  FROM event_user_roles WHERE status = 'active';
  
  SELECT ROUND(AVG(collab_count), 2) INTO avg_collabs
  FROM (
    SELECT COUNT(*) as collab_count
    FROM event_user_roles 
    WHERE status = 'active'
    GROUP BY event_id
  ) sub;
  
  -- Insert or update today's metrics
  INSERT INTO collaboration_metrics (
    metric_date, 
    total_collaborators, 
    active_invitations, 
    events_with_collaborators, 
    avg_collaborators_per_event
  )
  VALUES (
    current_date, 
    total_collabs, 
    active_invites, 
    events_with_collabs, 
    COALESCE(avg_collabs, 0)
  )
  ON CONFLICT (metric_date) 
  DO UPDATE SET
    total_collaborators = EXCLUDED.total_collaborators,
    active_invitations = EXCLUDED.active_invitations,
    events_with_collaborators = EXCLUDED.events_with_collaborators,
    avg_collaborators_per_event = EXCLUDED.avg_collaborators_per_event,
    created_at = NOW();
END;
$$;

-- Step 6: Add unique constraint to collaboration_metrics
ALTER TABLE collaboration_metrics 
ADD CONSTRAINT unique_metric_date 
UNIQUE (metric_date);

-- Step 7: Create optimized function for dashboard queries
CREATE OR REPLACE FUNCTION get_user_collaboration_summary(user_uuid UUID)
RETURNS TABLE (
  owned_events_count INTEGER,
  collaborative_events_count INTEGER,
  pending_invitations_count INTEGER,
  total_team_members INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM events WHERE user_id = user_uuid) as owned_events_count,
    (SELECT COUNT(DISTINCT event_id)::INTEGER FROM event_user_roles WHERE user_id = user_uuid AND status = 'active') as collaborative_events_count,
    (SELECT COUNT(*)::INTEGER FROM event_collaborator_invitations WHERE invited_by = user_uuid AND status = 'pending') as pending_invitations_count,
    (SELECT COUNT(DISTINCT eur.user_id)::INTEGER 
     FROM event_user_roles eur 
     JOIN events e ON eur.event_id = e.id 
     WHERE e.user_id = user_uuid AND eur.status = 'active') as total_team_members;
END;
$$;

-- Step 8: Create function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleaned_count INTEGER := 0;
BEGIN
  UPDATE event_collaborator_invitations 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  RETURN cleaned_count;
END;
$$;

-- Step 9: Create comprehensive health check function
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
  -- Check 1: Orphaned invitations
  RETURN QUERY
  SELECT 
    'orphaned_invitations'::TEXT as check_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
    'Invitations referencing non-existent events'::TEXT as details,
    COUNT(*)::INTEGER as count
  FROM event_collaborator_invitations eci
  LEFT JOIN events e ON eci.event_id = e.id
  WHERE e.id IS NULL;

  -- Check 2: Missing role entries for accepted invitations
  RETURN QUERY
  SELECT 
    'missing_role_entries'::TEXT as check_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
    'Accepted invitations without event_user_roles entries'::TEXT as details,
    COUNT(*)::INTEGER as count
  FROM event_collaborator_invitations eci
  LEFT JOIN event_user_roles eur ON eci.event_id = eur.event_id AND eci.accepted_by = eur.user_id
  WHERE eci.status = 'accepted' AND eci.accepted_by IS NOT NULL AND eur.id IS NULL;

  -- Check 3: Expired pending invitations
  RETURN QUERY
  SELECT 
    'expired_pending_invitations'::TEXT as check_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARNING' END as status,
    'Pending invitations that should be marked expired'::TEXT as details,
    COUNT(*)::INTEGER as count
  FROM event_collaborator_invitations
  WHERE status = 'pending' AND expires_at < NOW();

  -- Check 4: Duplicate role entries
  RETURN QUERY
  SELECT 
    'duplicate_role_entries'::TEXT as check_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
    'Duplicate event_user_roles entries'::TEXT as details,
    COUNT(*)::INTEGER as count
  FROM (
    SELECT event_id, user_id, COUNT(*) as dup_count
    FROM event_user_roles 
    WHERE status = 'active'
    GROUP BY event_id, user_id 
    HAVING COUNT(*) > 1
  ) duplicates;
END;
$$;

-- Step 10: Create automated maintenance function
CREATE OR REPLACE FUNCTION run_collaborator_maintenance()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
  maintenance_log TEXT := '';
BEGIN
  -- Clean up expired invitations
  SELECT cleanup_expired_invitations() INTO expired_count;
  maintenance_log := maintenance_log || 'Expired ' || expired_count || ' invitations. ';
  
  -- Update collaboration metrics
  PERFORM update_collaboration_metrics();
  maintenance_log := maintenance_log || 'Updated collaboration metrics. ';
  
  -- Refresh materialized view
  PERFORM refresh_user_event_access();
  maintenance_log := maintenance_log || 'Refreshed user access view. ';
  
  maintenance_log := maintenance_log || 'Maintenance completed at ' || NOW()::TEXT;
  
  RETURN maintenance_log;
END;
$$;

-- Step 11: Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_collaborative_events(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_collaboration_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION collaborator_system_health_check() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_invitations() TO service_role;
GRANT EXECUTE ON FUNCTION run_collaborator_maintenance() TO service_role;

-- Step 12: Create scheduled job for maintenance (if pg_cron is available)
-- This would typically be run by an external scheduler
-- SELECT cron.schedule('collaborator-maintenance', '0 2 * * *', 'SELECT run_collaborator_maintenance();');

COMMENT ON FUNCTION get_user_collaborative_events IS 'Efficiently retrieves all events where a user is a collaborator';
COMMENT ON FUNCTION get_user_collaboration_summary IS 'Provides dashboard summary statistics for user collaboration';
COMMENT ON FUNCTION collaborator_system_health_check IS 'Comprehensive health check for collaborator system integrity';
COMMENT ON FUNCTION run_collaborator_maintenance IS 'Automated maintenance routine for collaborator system';

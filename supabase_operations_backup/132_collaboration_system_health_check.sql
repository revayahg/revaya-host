-- Collaboration System Health Check and Maintenance
-- Run this to verify system integrity and performance

-- Step 1: Run comprehensive health check
SELECT * FROM collaborator_system_health_check();

-- Step 2: Check for performance issues
SELECT 
    'slow_queries' as check_name,
    CASE WHEN avg_duration < 1000 THEN 'PASS' ELSE 'WARNING' END as status,
    'Average query duration in milliseconds' as details,
    avg_duration::INTEGER as count
FROM (
    SELECT AVG(EXTRACT(EPOCH FROM NOW() - query_start) * 1000) as avg_duration
    FROM pg_stat_activity 
    WHERE state = 'active' AND query LIKE '%event_user_roles%'
) perf;

-- Step 3: Validate data consistency
WITH consistency_check AS (
    SELECT 
        COUNT(DISTINCT eci.id) as accepted_invitations,
        COUNT(DISTINCT eur.id) as role_entries,
        COUNT(DISTINCT CASE WHEN eci.accepted_by = eur.user_id AND eci.event_id = eur.event_id THEN eci.id END) as matched_entries
    FROM event_collaborator_invitations eci
    LEFT JOIN event_user_roles eur ON eci.accepted_by = eur.user_id AND eci.event_id = eur.event_id
    WHERE eci.status = 'accepted' AND eci.accepted_by IS NOT NULL
)
SELECT 
    'data_consistency' as check_name,
    CASE WHEN accepted_invitations = matched_entries THEN 'PASS' ELSE 'FAIL' END as status,
    'Accepted invitations should have corresponding role entries' as details,
    (accepted_invitations - matched_entries) as count
FROM consistency_check;

-- Step 4: Performance metrics summary
SELECT 
    'performance_summary' as metric_type,
    COUNT(*) as total_collaborators,
    COUNT(DISTINCT event_id) as events_with_collaborators,
    ROUND(AVG(collaborators_per_event), 2) as avg_collaborators_per_event
FROM (
    SELECT event_id, COUNT(*) as collaborators_per_event
    FROM event_user_roles 
    WHERE status = 'active'
    GROUP BY event_id
) sub;

-- Step 5: Recent activity summary
SELECT 
    'recent_activity' as metric_type,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_collaborators_week,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_collaborators_month,
    COUNT(*) as total_active_collaborators
FROM event_user_roles 
WHERE status = 'active';

-- Step 6: Invitation metrics
SELECT 
    'invitation_metrics' as metric_type,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invitations,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_invitations,
    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_invitations,
    ROUND(
        COUNT(CASE WHEN status = 'accepted' THEN 1 END)::NUMERIC / 
        NULLIF(COUNT(CASE WHEN status IN ('accepted', 'expired') THEN 1 END), 0) * 100, 2
    ) as acceptance_rate_percent
FROM event_collaborator_invitations;

-- Step 7: Clean up recommendations
SELECT 
    'cleanup_recommendations' as check_name,
    CASE 
        WHEN expired_count > 0 THEN 'ACTION_NEEDED'
        ELSE 'GOOD'
    END as status,
    'Old expired invitations should be cleaned up' as details,
    expired_count as count
FROM (
    SELECT COUNT(*) as expired_count
    FROM event_collaborator_invitations 
    WHERE status = 'expired' AND updated_at < NOW() - INTERVAL '90 days'
) cleanup;
-- Debug and Fix Collaborator Issue
-- Check current state and fix missing data

-- 1. Check what events exist
SELECT 'EVENTS TABLE:' as info;
SELECT id, name, user_id, created_by, created_at FROM events ORDER BY created_at DESC LIMIT 5;

-- 2. Check what's in event_user_roles
SELECT 'EVENT_USER_ROLES TABLE:' as info;
SELECT event_id, user_id, role, status, created_at FROM event_user_roles ORDER BY created_at DESC LIMIT 10;

-- 3. Check if event owners are missing from event_user_roles
SELECT 'MISSING EVENT OWNERS:' as info;
SELECT 
    e.id as event_id,
    e.name as event_name,
    COALESCE(e.user_id, e.created_by) as owner_user_id,
    'MISSING FROM event_user_roles' as issue
FROM events e
WHERE NOT EXISTS (
    SELECT 1 FROM event_user_roles eur 
    WHERE eur.event_id = e.id 
    AND eur.user_id = COALESCE(e.user_id, e.created_by)
);

-- 4. Insert missing event owners
INSERT INTO event_user_roles (event_id, user_id, role, status, created_at, updated_at)
SELECT DISTINCT
    e.id as event_id,
    COALESCE(e.user_id, e.created_by) as user_id,
    'admin' as role,
    'active' as status,
    e.created_at,
    NOW() as updated_at
FROM events e
WHERE NOT EXISTS (
    SELECT 1 FROM event_user_roles eur 
    WHERE eur.event_id = e.id 
    AND eur.user_id = COALESCE(e.user_id, e.created_by)
);

-- 5. Verify the fix
SELECT 'AFTER FIX - EVENT_USER_ROLES:' as info;
SELECT event_id, user_id, role, status, created_at FROM event_user_roles ORDER BY created_at DESC LIMIT 10;

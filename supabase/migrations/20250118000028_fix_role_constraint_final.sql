-- FINAL FIX: Ensure production database has correct role constraint
-- This fixes the role constraint to match development exactly

-- Step 1: Drop the old constraint that was created by migration 13
ALTER TABLE event_user_roles DROP CONSTRAINT IF EXISTS event_user_roles_role_check;

-- Step 2: Add the correct constraint with all 4 roles
ALTER TABLE event_user_roles ADD CONSTRAINT event_user_roles_role_check 
    CHECK (role IN ('owner', 'admin', 'editor', 'viewer'));

-- Step 3: Ensure event creators have 'owner' role
UPDATE event_user_roles 
SET role = 'owner' 
WHERE role = 'admin' 
AND user_id IN (
    SELECT created_by FROM events WHERE id = event_user_roles.event_id
);

-- Step 4: Ensure all event creators have 'owner' role in event_user_roles
INSERT INTO event_user_roles (event_id, user_id, role, status)
SELECT 
    e.id as event_id,
    e.created_by as user_id,
    'owner' as role,
    'active' as status
FROM events e
WHERE NOT EXISTS (
    SELECT 1 FROM event_user_roles eur 
    WHERE eur.event_id = e.id 
    AND eur.user_id = e.created_by
)
ON CONFLICT (event_id, user_id) DO UPDATE SET
    role = 'owner',
    status = 'active',
    updated_at = NOW();

-- Step 5: Verify the fix
SELECT 'Current roles in event_user_roles:' as info, role, COUNT(*) as count 
FROM event_user_roles 
GROUP BY role
ORDER BY role;

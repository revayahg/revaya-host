-- Fix existing collaborator data migration
-- This script ensures all accepted collaborator invitations have corresponding event_user_roles entries

-- First, let's see what we have
SELECT 'Current accepted invitations without roles:' as info;
SELECT 
    eci.id,
    eci.event_id,
    eci.email,
    eci.role,
    eci.status,
    eci.accepted_by,
    eci.accepted_at
FROM event_collaborator_invitations eci
LEFT JOIN event_user_roles eur ON (
    eci.event_id = eur.event_id AND 
    eci.accepted_by = eur.user_id
)
WHERE eci.status = 'accepted' 
AND eur.id IS NULL;

-- Insert missing event_user_roles entries for accepted invitations
INSERT INTO event_user_roles (event_id, user_id, role, status, created_at, updated_at)
SELECT DISTINCT
    eci.event_id,
    eci.accepted_by as user_id,
    eci.role,
    'active' as status,
    COALESCE(eci.accepted_at, NOW()) as created_at,
    NOW() as updated_at
FROM event_collaborator_invitations eci
LEFT JOIN event_user_roles eur ON (
    eci.event_id = eur.event_id AND 
    eci.accepted_by = eur.user_id
)
WHERE eci.status = 'accepted' 
AND eci.accepted_by IS NOT NULL
AND eur.id IS NULL;

-- Verify the fix
SELECT 'After migration - accepted invitations without roles:' as info;
SELECT 
    eci.id,
    eci.event_id,
    eci.email,
    eci.role,
    eci.status,
    eci.accepted_by,
    eci.accepted_at
FROM event_collaborator_invitations eci
LEFT JOIN event_user_roles eur ON (
    eci.event_id = eur.event_id AND 
    eci.accepted_by = eur.user_id
)
WHERE eci.status = 'accepted' 
AND eur.id IS NULL;

-- Show current event_user_roles count
SELECT 'Total event_user_roles entries:' as info, COUNT(*) as count
FROM event_user_roles;

-- Show breakdown by role
SELECT 'Roles breakdown:' as info, role, COUNT(*) as count
FROM event_user_roles
GROUP BY role
ORDER BY role;
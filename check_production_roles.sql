-- Check what roles are actually in the production database
SELECT 'event_user_roles roles:' as table_name, role, COUNT(*) as count 
FROM event_user_roles 
GROUP BY role
UNION ALL
SELECT 'event_collaborator_invitations permission_levels:' as table_name, permission_level, COUNT(*) as count 
FROM event_collaborator_invitations 
GROUP BY permission_level;

-- Check the actual constraint on event_user_roles
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'event_user_roles'::regclass 
AND conname LIKE '%role%';

-- Check if the table structure is correct
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'event_user_roles' 
ORDER BY ordinal_position;

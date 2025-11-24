-- Debug what's actually in the production database
SELECT 'event_user_roles table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'event_user_roles' 
ORDER BY ordinal_position;

SELECT 'event_user_roles constraints:' as info;
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'event_user_roles'::regclass;

SELECT 'event_user_roles actual data:' as info;
SELECT role, COUNT(*) as count 
FROM event_user_roles 
GROUP BY role;

SELECT 'event_collaborator_invitations table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'event_collaborator_invitations' 
ORDER BY ordinal_position;

SELECT 'event_collaborator_invitations constraints:' as info;
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'event_collaborator_invitations'::regclass;

SELECT 'event_collaborator_invitations actual data:' as info;
SELECT permission_level, COUNT(*) as count 
FROM event_collaborator_invitations 
GROUP BY permission_level;

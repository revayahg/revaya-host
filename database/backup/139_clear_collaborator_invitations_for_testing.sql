-- Clear collaborator invitations for fresh testing
-- Run this script in Supabase SQL Editor to reset invitation data

-- Clear all collaborator invitations
DELETE FROM event_collaborator_invitations;

-- Clear all event user roles (except event owners)
DELETE FROM event_user_roles WHERE role != 'owner';

-- Reset any notification data related to collaborator invitations
DELETE FROM notifications WHERE type = 'collaborator_invitation';

-- Verify tables are cleared
SELECT 'event_collaborator_invitations' as table_name, COUNT(*) as remaining_records FROM event_collaborator_invitations
UNION ALL
SELECT 'event_user_roles (non-owners)' as table_name, COUNT(*) as remaining_records FROM event_user_roles WHERE role != 'owner'
UNION ALL
SELECT 'collaboration notifications' as table_name, COUNT(*) as remaining_records FROM notifications WHERE type = 'collaborator_invitation';

-- Verification script for collaboration schema
-- Run this to check the current state before applying fixes

-- Check event_collaborator_invitations table structure
SELECT 
    'event_collaborator_invitations' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'event_collaborator_invitations' 
ORDER BY ordinal_position;

-- Check constraints on event_collaborator_invitations
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'event_collaborator_invitations';

-- Check existing policies
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('event_collaborator_invitations', 'event_user_roles')
ORDER BY tablename, policyname;

-- Verify if functions exist
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name IN ('send_collaborator_invitation', 'validate_invitation_token', 'get_event_invitation_details')
ORDER BY routine_name;
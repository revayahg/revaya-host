-- Debug invitation update policies and permissions

-- First, let's see what policies exist on event_invitations
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'event_invitations';

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'event_invitations';

-- Check if there are any triggers that might interfere
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'event_invitations';

-- Check current data first
SELECT id, response, vendor_name, vendor_email, created_at, updated_at 
FROM event_invitations 
ORDER BY created_at DESC 
LIMIT 10;

-- Temporarily disable RLS to test if that's the issue
-- WARNING: This is for debugging only - re-enable after testing
ALTER TABLE event_invitations DISABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows updates by anyone (for debugging)
-- This should be replaced with proper policies after debugging
DROP POLICY IF EXISTS debug_allow_all_updates ON event_invitations;
CREATE POLICY debug_allow_all_updates ON event_invitations 
FOR UPDATE USING (true) WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE event_invitations ENABLE ROW LEVEL SECURITY;

-- Test a direct update (replace 'your-invitation-id-here' with an actual ID from the SELECT above)
-- UPDATE event_invitations SET response = 'accepted', updated_at = NOW() WHERE id = 'your-invitation-id-here';

-- Verify the update worked
SELECT id, response, vendor_name, vendor_email, created_at, updated_at 
FROM event_invitations 
WHERE response IS NOT NULL
ORDER BY updated_at DESC 
LIMIT 5;

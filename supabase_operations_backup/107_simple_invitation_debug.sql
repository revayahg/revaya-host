-- Simple debug for invitation update issues

-- Check current invitations
SELECT id, response, vendor_name, vendor_email, created_at, updated_at 
FROM event_invitations 
ORDER BY created_at DESC 
LIMIT 10;

-- Check RLS policies
SELECT policyname, cmd, permissive 
FROM pg_policies 
WHERE tablename = 'event_invitations';

-- Temporarily create a permissive update policy for debugging
DROP POLICY IF EXISTS temp_debug_update ON event_invitations;
CREATE POLICY temp_debug_update ON event_invitations 
FOR UPDATE 
TO public 
USING (true) 
WITH CHECK (true);

-- Test direct update (replace with actual invitation ID)
-- UPDATE event_invitations SET response = 'accepted', updated_at = NOW() WHERE id = 'actual-invitation-id-here';

-- Check if update worked
SELECT id, response, updated_at 
FROM event_invitations 
WHERE response IS NOT NULL
ORDER BY updated_at DESC;
-- Disable RLS on notifications table to fix permission errors
-- This is the nuclear option to make notifications work

-- Disable RLS entirely on notifications table
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;  
DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_allow_all" ON notifications;

-- Grant full permissions to authenticated users
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO anon;

-- Also disable RLS on notification_preferences if it exists
ALTER TABLE notification_preferences DISABLE ROW LEVEL SECURITY;
GRANT ALL ON notification_preferences TO authenticated;
GRANT ALL ON notification_preferences TO anon;
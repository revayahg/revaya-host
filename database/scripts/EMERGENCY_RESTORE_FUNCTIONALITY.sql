-- EMERGENCY RESTORE FUNCTIONALITY
-- Disable RLS immediately to restore all collaborative features

-- Step 1: Completely disable RLS on all problematic tables
ALTER TABLE event_user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_collaborator_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE pins DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view their own event roles" ON event_user_roles;
DROP POLICY IF EXISTS "Event creators can manage roles" ON event_user_roles;
DROP POLICY IF EXISTS "Users can view invitations they sent or received" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Event creators can create invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Users can view messages for events they have access to" ON message_threads;
DROP POLICY IF EXISTS "Users can create messages for events they have access to" ON message_threads;
DROP POLICY IF EXISTS "Users can view messages in threads they have access to" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in threads they have access to" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
DROP POLICY IF EXISTS "Users can view tasks for events they have access to" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks for events they have access to" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks for events they have access to" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks for events they have access to" ON tasks;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view pins for events they have access to" ON pins;
DROP POLICY IF EXISTS "Users can create pins for events they have access to" ON pins;
DROP POLICY IF EXISTS "Users can update pins for events they have access to" ON pins;
DROP POLICY IF EXISTS "Users can delete pins for events they have access to" ON pins;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view other profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;

-- Step 3: Test that tables are accessible
SELECT 'event_user_roles table accessible' as status, COUNT(*) as count FROM event_user_roles;
SELECT 'event_collaborator_invitations table accessible' as status, COUNT(*) as count FROM event_collaborator_invitations;
SELECT 'message_threads table accessible' as status, COUNT(*) as count FROM message_threads;
SELECT 'messages table accessible' as status, COUNT(*) as count FROM messages;
SELECT 'tasks table accessible' as status, COUNT(*) as count FROM tasks;
SELECT 'notifications table accessible' as status, COUNT(*) as count FROM notifications;
SELECT 'pins table accessible' as status, COUNT(*) as count FROM pins;
SELECT 'profiles table accessible' as status, COUNT(*) as count FROM profiles;

SELECT 'EMERGENCY RESTORE COMPLETE - All functionality should be restored' as status;

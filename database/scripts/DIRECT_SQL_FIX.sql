-- DIRECT SQL FIX FOR INFINITE RECURSION
-- Copy and paste this entire script into Supabase SQL Editor and run it

-- Step 1: Completely disable RLS on all problematic tables
ALTER TABLE event_user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_collaborator_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE pins DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own event roles" ON event_user_roles;
DROP POLICY IF EXISTS "Event creators can manage roles" ON event_user_roles;
DROP POLICY IF EXISTS "Event owners/admins can manage roles" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_select_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_insert_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_update_policy" ON event_user_roles;
DROP POLICY IF EXISTS "event_user_roles_delete_policy" ON event_user_roles;

DROP POLICY IF EXISTS "Users can view invitations they sent or received" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Event admins can create invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Allow invitation updates for acceptance" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Public read for invitation tokens" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Event participants can view invitations" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "collaborator_invitations_policy" ON event_collaborator_invitations;
DROP POLICY IF EXISTS "Event creators can create invitations" ON event_collaborator_invitations;

-- Drop policies on message_threads
DROP POLICY IF EXISTS "Users can view messages for events they have access to" ON message_threads;
DROP POLICY IF EXISTS "Users can create messages for events they have access to" ON message_threads;
DROP POLICY IF EXISTS "Users can update their own messages" ON message_threads;
DROP POLICY IF EXISTS "Users can delete their own messages" ON message_threads;
DROP POLICY IF EXISTS "message_threads_select_policy" ON message_threads;
DROP POLICY IF EXISTS "message_threads_insert_policy" ON message_threads;
DROP POLICY IF EXISTS "message_threads_update_policy" ON message_threads;
DROP POLICY IF EXISTS "message_threads_delete_policy" ON message_threads;

-- Drop policies on messages table
DROP POLICY IF EXISTS "Users can view messages in threads they have access to" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in threads they have access to" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
DROP POLICY IF EXISTS "messages_update_policy" ON messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON messages;

-- Drop policies on tasks table
DROP POLICY IF EXISTS "Users can view tasks for events they have access to" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks for events they have access to" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks for events they have access to" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks for events they have access to" ON tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;

-- Drop policies on notifications table
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON notifications;

-- Drop policies on pins table
DROP POLICY IF EXISTS "Users can view pins for events they have access to" ON pins;
DROP POLICY IF EXISTS "Users can create pins for events they have access to" ON pins;
DROP POLICY IF EXISTS "Users can update pins for events they have access to" ON pins;
DROP POLICY IF EXISTS "Users can delete pins for events they have access to" ON pins;
DROP POLICY IF EXISTS "pins_select_policy" ON pins;
DROP POLICY IF EXISTS "pins_insert_policy" ON pins;
DROP POLICY IF EXISTS "pins_update_policy" ON pins;
DROP POLICY IF EXISTS "pins_delete_policy" ON pins;

-- Drop policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view other profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Step 3: Check and fix the role constraint
-- First, let's see what the current constraint allows
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'event_user_roles'::regclass 
AND contype = 'c';

-- Drop the existing role constraint (it might be named differently)
ALTER TABLE event_user_roles DROP CONSTRAINT IF EXISTS event_user_roles_role_check;
ALTER TABLE event_user_roles DROP CONSTRAINT IF EXISTS valid_role;
ALTER TABLE event_user_roles DROP CONSTRAINT IF EXISTS event_user_roles_role_check1;

-- Add the new constraint with 'owner' role
ALTER TABLE event_user_roles ADD CONSTRAINT event_user_roles_role_check
    CHECK (role IN ('owner', 'admin', 'editor', 'viewer'));

-- Step 4: Update any existing 'admin' roles to 'owner' for event creators
UPDATE event_user_roles
SET role = 'owner'
WHERE role = 'admin'
AND user_id IN (
    SELECT created_by FROM events WHERE id = event_user_roles.event_id
);

-- Step 5: Ensure event creators have 'admin' role in event_user_roles (until we fix the constraint)
INSERT INTO event_user_roles (event_id, user_id, role, status)
SELECT
    e.id as event_id,
    e.created_by as user_id,
    'admin' as role,
    'active' as status
FROM events e
WHERE NOT EXISTS (
    SELECT 1 FROM event_user_roles eur
    WHERE eur.event_id = e.id
    AND eur.user_id = e.created_by
)
ON CONFLICT (event_id, user_id) DO UPDATE SET
    role = 'admin',
    status = 'active',
    updated_at = NOW();

-- Step 6: Fix pins table schema (add missing columns)
-- Add notes column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pins' AND column_name = 'notes'
    ) THEN
        ALTER TABLE pins ADD COLUMN notes TEXT DEFAULT '';
        RAISE NOTICE 'Added notes column to pins table';
    END IF;
END $$;

-- Add visible_to_vendor column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pins' AND column_name = 'visible_to_vendor'
    ) THEN
        ALTER TABLE pins ADD COLUMN visible_to_vendor BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added visible_to_vendor column to pins table';
    END IF;
END $$;

-- Add assignee_vendor_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pins' AND column_name = 'assignee_vendor_id'
    ) THEN
        ALTER TABLE pins ADD COLUMN assignee_vendor_id UUID REFERENCES vendor_profiles(id);
        RAISE NOTICE 'Added assignee_vendor_id column to pins table';
    END IF;
END $$;

-- Step 7: Test that the tables work without RLS
SELECT 'event_user_roles table accessible' as status, COUNT(*) as count FROM event_user_roles;
SELECT 'event_collaborator_invitations table accessible' as status, COUNT(*) as count FROM event_collaborator_invitations;
SELECT 'message_threads table accessible' as status, COUNT(*) as count FROM message_threads;
SELECT 'messages table accessible' as status, COUNT(*) as count FROM messages;
SELECT 'tasks table accessible' as status, COUNT(*) as count FROM tasks;
SELECT 'notifications table accessible' as status, COUNT(*) as count FROM notifications;
SELECT 'pins table accessible' as status, COUNT(*) as count FROM pins;
SELECT 'profiles table accessible' as status, COUNT(*) as count FROM profiles;

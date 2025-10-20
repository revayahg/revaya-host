-- Temporarily disable RLS on messaging tables to fix infinite recursion
-- We'll implement application-level security instead

-- Drop all existing policies
DROP POLICY IF EXISTS "thread_select_policy" ON message_threads;
DROP POLICY IF EXISTS "thread_insert_policy" ON message_threads;
DROP POLICY IF EXISTS "participants_select_policy" ON message_participants;
DROP POLICY IF EXISTS "participants_insert_policy" ON message_participants;
DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;

-- Disable RLS completely for now
ALTER TABLE message_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_participants DISABLE ROW LEVEL SECURITY;

-- Note: We'll implement security at the application level
-- by checking event ownership and vendor assignments before
-- allowing access to messages
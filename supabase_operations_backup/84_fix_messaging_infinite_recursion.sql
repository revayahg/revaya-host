-- Fix infinite recursion in messaging system RLS policies
-- Remove circular references that cause recursion

-- Drop all existing policies first
DROP POLICY IF EXISTS "View message threads" ON message_threads;
DROP POLICY IF EXISTS "Create message threads" ON message_threads;
DROP POLICY IF EXISTS "View messages" ON messages;
DROP POLICY IF EXISTS "Create messages" ON messages;
DROP POLICY IF EXISTS "View message participants" ON message_participants;
DROP POLICY IF EXISTS "Manage message participants" ON message_participants;

-- Disable RLS temporarily to clean up
ALTER TABLE message_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_participants DISABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies

-- message_threads policies - only check direct ownership
CREATE POLICY "thread_select_policy" ON message_threads
FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "thread_insert_policy" ON message_threads
FOR INSERT WITH CHECK (auth.uid() = created_by);

-- message_participants policies - only check direct user_id
CREATE POLICY "participants_select_policy" ON message_participants
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "participants_insert_policy" ON message_participants
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- messages policies - check sender_id and simple thread ownership
CREATE POLICY "messages_select_policy" ON messages
FOR SELECT USING (
  auth.uid() = sender_id 
  OR 
  EXISTS (
    SELECT 1 FROM message_threads mt 
    WHERE mt.id = messages.thread_id 
    AND mt.created_by = auth.uid()
  )
);

CREATE POLICY "messages_insert_policy" ON messages
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Re-enable RLS
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_participants ENABLE ROW LEVEL SECURITY;
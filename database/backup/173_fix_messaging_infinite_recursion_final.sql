-- Fix infinite recursion in messaging system policies
-- This creates simple, non-recursive policies for all messaging tables

-- Disable RLS temporarily to drop existing policies
ALTER TABLE message_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_participants DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view threads they participate in" ON message_threads;
DROP POLICY IF EXISTS "Users can create threads" ON message_threads;
DROP POLICY IF EXISTS "Users can view messages in their threads" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in their threads" ON messages;
DROP POLICY IF EXISTS "Users can view their participations" ON message_participants;
DROP POLICY IF EXISTS "Users can create participations" ON message_participants;
DROP POLICY IF EXISTS "thread_participants_policy" ON message_threads;
DROP POLICY IF EXISTS "messages_participants_policy" ON messages;
DROP POLICY IF EXISTS "participants_policy" ON message_participants;

-- Create simple, direct policies without recursive queries

-- Message Threads Policies
CREATE POLICY "thread_access_policy" ON message_threads
FOR ALL USING (
  auth.uid() IS NOT NULL AND (
    -- Event participants can access event threads
    event_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM event_user_roles 
      WHERE event_id = message_threads.event_id 
      AND user_id = auth.uid()
    )
  )
);

-- Messages Policies  
CREATE POLICY "messages_access_policy" ON messages
FOR ALL USING (
  auth.uid() IS NOT NULL AND (
    -- Message sender can access
    sender_id = auth.uid() OR
    -- Thread participants can access (simple direct check)
    EXISTS (
      SELECT 1 FROM message_threads 
      WHERE id = messages.thread_id 
      AND event_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM event_user_roles 
        WHERE event_id = message_threads.event_id 
        AND user_id = auth.uid()
      )
    )
  )
);

-- Message Participants Policies
CREATE POLICY "participants_access_policy" ON message_participants
FOR ALL USING (
  auth.uid() IS NOT NULL AND (
    -- User can see their own participation
    user_id = auth.uid() OR
    -- Event participants can manage participants
    EXISTS (
      SELECT 1 FROM message_threads 
      WHERE id = message_participants.thread_id 
      AND event_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM event_user_roles 
        WHERE event_id = message_threads.event_id 
        AND user_id = auth.uid()
      )
    )
  )
);

-- Re-enable RLS
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_participants ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON message_threads TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON message_participants TO authenticated;
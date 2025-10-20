-- Fix messaging policies for collaborator access
-- Run this SQL in your Supabase SQL editor

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view threads for events they have access to" ON message_threads;
DROP POLICY IF EXISTS "Users can view messages in threads they have access to" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in threads they have access to" ON messages;
DROP POLICY IF EXISTS "Users can view participants in threads they have access to" ON message_participants;

-- Create simplified policies that check both ownership and collaboration

-- Message threads policy - allow access for event owners and active collaborators
CREATE POLICY "Allow access to event threads for owners and collaborators" ON message_threads
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM events e 
    WHERE e.id = message_threads.event_id 
    AND (e.created_by = auth.uid() OR e.user_id = auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM event_user_roles eur 
    WHERE eur.event_id = message_threads.event_id 
    AND eur.user_id = auth.uid() 
    AND eur.status = 'active'
  )
);

-- Messages policy - allow access based on thread access
CREATE POLICY "Allow access to messages for authorized thread participants" ON messages
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM message_threads mt
    WHERE mt.id = messages.thread_id
    AND (
      EXISTS (
        SELECT 1 FROM events e 
        WHERE e.id = mt.event_id 
        AND (e.created_by = auth.uid() OR e.user_id = auth.uid())
      )
      OR
      EXISTS (
        SELECT 1 FROM event_user_roles eur 
        WHERE eur.event_id = mt.event_id 
        AND eur.user_id = auth.uid() 
        AND eur.status = 'active'
      )
    )
  )
);

-- Message participants policy - allow access based on thread access
CREATE POLICY "Allow access to thread participants for authorized users" ON message_participants
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM message_threads mt
    WHERE mt.id = message_participants.thread_id
    AND (
      EXISTS (
        SELECT 1 FROM events e 
        WHERE e.id = mt.event_id 
        AND (e.created_by = auth.uid() OR e.user_id = auth.uid())
      )
      OR
      EXISTS (
        SELECT 1 FROM event_user_roles eur 
        WHERE eur.event_id = mt.event_id 
        AND eur.user_id = auth.uid() 
        AND eur.status = 'active'
      )
    )
  )
);

-- Ensure RLS is enabled
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_participants ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON message_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON message_participants TO authenticated;
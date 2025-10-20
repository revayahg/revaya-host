-- Fix messaging policies for collaborator access without conflicts
-- Drop existing policies first to avoid conflicts

-- Drop existing policies for message_threads
DROP POLICY IF EXISTS "enable_all_for_event_participants" ON message_threads;
DROP POLICY IF EXISTS "Users can view threads for events they participate in" ON message_threads;
DROP POLICY IF EXISTS "Users can create threads for events they participate in" ON message_threads;

-- Drop existing policies for messages
DROP POLICY IF EXISTS "enable_all_for_event_participants" ON messages;
DROP POLICY IF EXISTS "Users can view messages for threads they participate in" ON messages;
DROP POLICY IF EXISTS "Users can create messages for threads they participate in" ON messages;

-- Drop existing policies for message_participants
DROP POLICY IF EXISTS "enable_all_for_event_participants" ON message_participants;
DROP POLICY IF EXISTS "Users can view participants for threads they participate in" ON message_participants;
DROP POLICY IF EXISTS "Users can manage their own participation" ON message_participants;

-- Create new unified policies for message_threads
CREATE POLICY "thread_access_for_event_members" ON message_threads
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM events e 
    WHERE e.id = event_id 
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

-- Create new unified policies for messages
CREATE POLICY "message_access_for_thread_participants" ON messages
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

-- Create new unified policies for message_participants
CREATE POLICY "participant_access_for_event_members" ON message_participants
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
GRANT ALL ON message_threads TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON message_participants TO authenticated;

-- Test the policies by checking if they work
SELECT 'Messaging policies updated successfully' as status;
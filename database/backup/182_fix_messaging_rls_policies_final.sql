-- ===================================================================
-- Fix Messaging RLS Policies - Final Solution
-- ===================================================================

-- Drop all existing messaging policies to prevent conflicts
DROP POLICY IF EXISTS "event_participants_can_access_threads" ON message_threads;
DROP POLICY IF EXISTS "event_participants_can_access_messages" ON messages;
DROP POLICY IF EXISTS "Users can view threads they participate in" ON message_threads;
DROP POLICY IF EXISTS "Users can create threads for events they have access to" ON message_threads;
DROP POLICY IF EXISTS "Users can view messages in threads they participate in" ON messages;
DROP POLICY IF EXISTS "Users can create messages in threads they participate in" ON messages;

-- Temporarily disable RLS to rebuild policies
ALTER TABLE message_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- MESSAGE THREADS POLICIES
-- ===================================================================

-- Policy 1: Users can view threads for events they have access to
CREATE POLICY "threads_select_policy" ON message_threads
FOR SELECT
USING (
  -- Event owner can see all threads
  EXISTS (
    SELECT 1 FROM events e 
    WHERE e.id = message_threads.event_id 
    AND (e.created_by = auth.uid() OR e.user_id = auth.uid())
  )
  OR
  -- Event collaborators can see all threads
  EXISTS (
    SELECT 1 FROM event_user_roles eur 
    WHERE eur.event_id = message_threads.event_id 
    AND eur.user_id = auth.uid() 
    AND eur.status = 'active'
  )
);

-- Policy 2: Users can create threads for events they have access to
CREATE POLICY "threads_insert_policy" ON message_threads
FOR INSERT
WITH CHECK (
  -- Event owner can create threads
  EXISTS (
    SELECT 1 FROM events e 
    WHERE e.id = message_threads.event_id 
    AND (e.created_by = auth.uid() OR e.user_id = auth.uid())
  )
  OR
  -- Event collaborators can create threads
  EXISTS (
    SELECT 1 FROM event_user_roles eur 
    WHERE eur.event_id = message_threads.event_id 
    AND eur.user_id = auth.uid() 
    AND eur.status = 'active'
  )
);

-- Policy 3: Users can update threads they created
CREATE POLICY "threads_update_policy" ON message_threads
FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- ===================================================================
-- MESSAGES POLICIES
-- ===================================================================

-- Policy 1: Users can view messages in threads they have access to
CREATE POLICY "messages_select_policy" ON messages
FOR SELECT
USING (
  -- Check if user has access to the event associated with this message's thread
  EXISTS (
    SELECT 1 FROM message_threads mt
    JOIN events e ON e.id = mt.event_id
    WHERE mt.id = messages.thread_id
    AND (
      -- Event owner
      (e.created_by = auth.uid() OR e.user_id = auth.uid())
      OR
      -- Event collaborator
      EXISTS (
        SELECT 1 FROM event_user_roles eur 
        WHERE eur.event_id = e.id 
        AND eur.user_id = auth.uid() 
        AND eur.status = 'active'
      )
    )
  )
);

-- Policy 2: Users can create messages in threads they have access to
CREATE POLICY "messages_insert_policy" ON messages
FOR INSERT
WITH CHECK (
  -- Check if user has access to the event associated with this message's thread
  EXISTS (
    SELECT 1 FROM message_threads mt
    JOIN events e ON e.id = mt.event_id
    WHERE mt.id = messages.thread_id
    AND (
      -- Event owner
      (e.created_by = auth.uid() OR e.user_id = auth.uid())
      OR
      -- Event collaborator
      EXISTS (
        SELECT 1 FROM event_user_roles eur 
        WHERE eur.event_id = e.id 
        AND eur.user_id = auth.uid() 
        AND eur.status = 'active'
      )
    )
  )
  AND
  -- User must be the sender
  sender_id = auth.uid()
);

-- Policy 3: Users can update their own messages
CREATE POLICY "messages_update_policy" ON messages
FOR UPDATE
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

-- ===================================================================
-- HELPER FUNCTIONS
-- ===================================================================

-- Function to check if user has access to an event
CREATE OR REPLACE FUNCTION user_has_event_access(event_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is event owner
  IF EXISTS (
    SELECT 1 FROM events 
    WHERE id = event_uuid 
    AND (created_by = user_uuid OR user_id = user_uuid)
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is event collaborator
  IF EXISTS (
    SELECT 1 FROM event_user_roles 
    WHERE event_id = event_uuid 
    AND user_id = user_uuid 
    AND status = 'active'
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- ===================================================================
-- ENSURE EVENT OWNERS HAVE PROPER ROLES
-- ===================================================================

-- Make sure all event owners have admin roles in event_user_roles
INSERT INTO event_user_roles (event_id, user_id, role, status, created_at)
SELECT 
    e.id,
    COALESCE(e.created_by, e.user_id) as owner_id,
    'admin',
    'active',
    NOW()
FROM events e
WHERE COALESCE(e.created_by, e.user_id) IS NOT NULL
ON CONFLICT (event_id, user_id) 
DO UPDATE SET 
    role = 'admin',
    status = 'active';

-- ===================================================================
-- GRANT NECESSARY PERMISSIONS
-- ===================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON message_threads TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_event_access TO authenticated;
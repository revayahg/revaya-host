-- ===================================================================
-- Messaging System V2 - RLS Policies
-- ===================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "message_threads_access" ON message_threads;
DROP POLICY IF EXISTS "messages_access" ON messages;
DROP POLICY IF EXISTS "message_participants_access" ON message_participants;

-- ===================================================================
-- MESSAGE THREADS POLICIES
-- ===================================================================
CREATE POLICY "message_threads_access" ON message_threads
FOR ALL USING (
    -- User must be event participant (owner, collaborator, or vendor)
    EXISTS (
        SELECT 1 FROM event_user_roles eur
        WHERE eur.event_id = message_threads.event_id
        AND eur.user_id = auth.uid()
        AND eur.status = 'active'
    )
    OR
    EXISTS (
        SELECT 1 FROM event_vendors ev
        JOIN vendor_profiles vp ON ev.vendor_id = vp.id
        WHERE ev.event_id = message_threads.event_id
        AND vp.user_id = auth.uid()
    )
);

-- ===================================================================
-- MESSAGES POLICIES
-- ===================================================================
CREATE POLICY "messages_access" ON messages
FOR ALL USING (
    -- User must be participant in the thread
    EXISTS (
        SELECT 1 FROM message_participants mp
        WHERE mp.thread_id = messages.thread_id
        AND mp.user_id = auth.uid()
    )
);

-- ===================================================================
-- MESSAGE PARTICIPANTS POLICIES
-- ===================================================================
CREATE POLICY "message_participants_access" ON message_participants
FOR ALL USING (
    -- User can see their own participation records
    message_participants.user_id = auth.uid()
    OR
    -- Or they are a participant in the same thread
    EXISTS (
        SELECT 1 FROM message_participants mp2
        WHERE mp2.thread_id = message_participants.thread_id
        AND mp2.user_id = auth.uid()
    )
);
-- Fix infinite recursion in messaging system policies
-- Drop all existing problematic policies first

-- Disable RLS temporarily to avoid conflicts
ALTER TABLE message_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_participants DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view threads they participate in" ON message_threads;
DROP POLICY IF EXISTS "Users can create threads for events they access" ON message_threads;
DROP POLICY IF EXISTS "Users can view messages in their threads" ON messages;
DROP POLICY IF EXISTS "Users can create messages in their threads" ON messages;
DROP POLICY IF EXISTS "Users can view their participation records" ON message_participants;
DROP POLICY IF EXISTS "System can manage participation records" ON message_participants;

-- Create simple, non-recursive policies
-- Thread policies - direct checks only
CREATE POLICY "thread_select_policy" ON message_threads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM message_participants mp 
            WHERE mp.thread_id = message_threads.id 
            AND mp.user_id = auth.uid()
        )
    );

CREATE POLICY "thread_insert_policy" ON message_threads
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_user_roles eur 
            WHERE eur.event_id = message_threads.event_id 
            AND eur.user_id = auth.uid()
            AND eur.status = 'active'
        )
    );

-- Message policies - direct thread access check
CREATE POLICY "message_select_policy" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM message_participants mp 
            WHERE mp.thread_id = messages.thread_id 
            AND mp.user_id = auth.uid()
        )
    );

CREATE POLICY "message_insert_policy" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM message_participants mp 
            WHERE mp.thread_id = messages.thread_id 
            AND mp.user_id = auth.uid()
        )
    );

-- Participant policies - simple direct checks
CREATE POLICY "participant_select_policy" ON message_participants
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "participant_insert_policy" ON message_participants
    FOR INSERT WITH CHECK (
        -- Allow if user has access to the event
        EXISTS (
            SELECT 1 FROM message_threads mt
            JOIN event_user_roles eur ON mt.event_id = eur.event_id
            WHERE mt.id = message_participants.thread_id
            AND eur.user_id = auth.uid()
            AND eur.status = 'active'
        )
    );

-- Re-enable RLS
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_participants ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT ON message_threads TO authenticated;
GRANT SELECT, INSERT ON messages TO authenticated;
GRANT SELECT, INSERT ON message_participants TO authenticated;
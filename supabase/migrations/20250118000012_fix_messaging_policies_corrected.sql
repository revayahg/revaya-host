-- Fix Messaging RLS Policies - Corrected Version
-- This script uses the actual column names from the message_threads table

-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "threads_select_policy" ON message_threads;
DROP POLICY IF EXISTS "threads_insert_policy" ON message_threads;
DROP POLICY IF EXISTS "threads_update_policy" ON message_threads;
DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;

-- =============================================================================
-- MESSAGE THREADS POLICIES
-- =============================================================================

-- Policy 1: Users can view threads for events they have access to
CREATE POLICY "threads_select_policy" ON message_threads
FOR SELECT
USING (
    -- Check if user has access to the event associated with this thread
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
    -- Check if user has access to the event
    EXISTS (
        SELECT 1 FROM event_user_roles eur
        WHERE eur.event_id = message_threads.event_id
        AND eur.user_id = auth.uid()
        AND eur.status = 'active'
    )
);

-- Policy 3: Users can update threads for events they have access to
CREATE POLICY "threads_update_policy" ON message_threads
FOR UPDATE
USING (
    -- Check if user has access to the event
    EXISTS (
        SELECT 1 FROM event_user_roles eur
        WHERE eur.event_id = message_threads.event_id
        AND eur.user_id = auth.uid()
        AND eur.status = 'active'
    )
);

-- =============================================================================
-- MESSAGES POLICIES
-- =============================================================================

-- Policy 1: Users can view messages in threads they have access to
CREATE POLICY "messages_select_policy" ON messages
FOR SELECT
USING (
    -- Check if user has access to the event associated with this message's thread
    EXISTS (
        SELECT 1 FROM message_threads mt
        JOIN event_user_roles eur ON eur.event_id = mt.event_id
        WHERE mt.id = messages.thread_id
        AND eur.user_id = auth.uid()
        AND eur.status = 'active'
    )
);

-- Policy 2: Users can insert messages in threads they have access to
CREATE POLICY "messages_insert_policy" ON messages
FOR INSERT
WITH CHECK (
    -- Check if user has access to the event associated with this message's thread
    EXISTS (
        SELECT 1 FROM message_threads mt
        JOIN event_user_roles eur ON eur.event_id = mt.event_id
        WHERE mt.id = messages.thread_id
        AND eur.user_id = auth.uid()
        AND eur.status = 'active'
    )
    AND sender_id = auth.uid()  -- Users can only send messages as themselves
);

-- Enable RLS on both tables
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON message_threads TO authenticated;
GRANT SELECT, INSERT ON messages TO authenticated;

-- Note: This script uses the actual column structure:
-- message_threads: id, event_id, subject, last_message_at, last_message_preview, created_at, is_archived
-- No created_by column exists, so we rely on event_user_roles for access control
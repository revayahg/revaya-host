-- Row Level Security Policies for Event Messaging System

-- ========================================
-- MESSAGE_THREADS POLICIES
-- ========================================

-- Allow planners to create threads for their events
CREATE POLICY "Planners can create message threads for their events"
ON message_threads FOR INSERT
WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id::TEXT = message_threads.event_id 
        AND events.user_id = auth.uid()
    )
);

-- Allow participants to view threads they're part of
CREATE POLICY "Users can view threads they participate in"
ON message_threads FOR SELECT
USING (
    -- Thread creator can always see
    auth.uid() = created_by OR
    -- Participants can see
    EXISTS (
        SELECT 1 FROM message_participants
        WHERE message_participants.thread_id = message_threads.id
        AND message_participants.user_id = auth.uid()
    ) OR
    -- Event owner can see all threads
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id::TEXT = message_threads.event_id
        AND events.user_id = auth.uid()
    ) OR
    -- Assigned vendors can see threads
    EXISTS (
        SELECT 1 FROM event_invitations ei
        JOIN vendor_profiles vp ON vp.id = ei.vendor_profile_id
        WHERE ei.event_id::TEXT = message_threads.event_id
        AND vp.user_id = auth.uid()
        AND ei.response = 'accepted'
    )
);

-- Allow thread creators to update their threads
CREATE POLICY "Thread creators can update their threads"
ON message_threads FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- ========================================
-- MESSAGES POLICIES
-- ========================================

-- Allow users to create messages in threads they participate in
CREATE POLICY "Users can create messages in their threads"
ON messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND
    (
        -- Thread creator can send
        EXISTS (
            SELECT 1 FROM message_threads
            WHERE message_threads.id = messages.thread_id
            AND message_threads.created_by = auth.uid()
        ) OR
        -- Participants can send
        EXISTS (
            SELECT 1 FROM message_participants
            WHERE message_participants.thread_id = messages.thread_id
            AND message_participants.user_id = auth.uid()
        ) OR
        -- Event owner can send
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id::TEXT = messages.event_id
            AND events.user_id = auth.uid()
        ) OR
        -- Assigned vendors can send
        EXISTS (
            SELECT 1 FROM event_invitations ei
            JOIN vendor_profiles vp ON vp.id = ei.vendor_profile_id
            WHERE ei.event_id::TEXT = messages.event_id
            AND vp.user_id = auth.uid()
            AND ei.response = 'accepted'
        )
    )
);

-- Allow users to view messages in threads they participate in
CREATE POLICY "Users can view messages in their threads"
ON messages FOR SELECT
USING (
    -- Sender can always see their messages
    auth.uid() = sender_id OR
    -- Thread creator can see all messages
    EXISTS (
        SELECT 1 FROM message_threads
        WHERE message_threads.id = messages.thread_id
        AND message_threads.created_by = auth.uid()
    ) OR
    -- Participants can see messages
    EXISTS (
        SELECT 1 FROM message_participants
        WHERE message_participants.thread_id = messages.thread_id
        AND message_participants.user_id = auth.uid()
    ) OR
    -- Event owner can see all messages
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id::TEXT = messages.event_id
        AND events.user_id = auth.uid()
    ) OR
    -- Assigned vendors can see messages
    EXISTS (
        SELECT 1 FROM event_invitations ei
        JOIN vendor_profiles vp ON vp.id = ei.vendor_profile_id
        WHERE ei.event_id::TEXT = messages.event_id
        AND vp.user_id = auth.uid()
        AND ei.response = 'accepted'
    )
);

-- Allow users to update their own messages (for read status, etc.)
CREATE POLICY "Users can update messages they can access"
ON messages FOR UPDATE
USING (
    -- Same logic as SELECT policy
    auth.uid() = sender_id OR
    EXISTS (
        SELECT 1 FROM message_threads
        WHERE message_threads.id = messages.thread_id
        AND message_threads.created_by = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM message_participants
        WHERE message_participants.thread_id = messages.thread_id
        AND message_participants.user_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id::TEXT = messages.event_id
        AND events.user_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM event_invitations ei
        JOIN vendor_profiles vp ON vp.id = ei.vendor_profile_id
        WHERE ei.event_id::TEXT = messages.event_id
        AND vp.user_id = auth.uid()
        AND ei.response = 'accepted'
    )
);

-- ========================================
-- MESSAGE_PARTICIPANTS POLICIES
-- ========================================

-- Allow thread creators to add participants
CREATE POLICY "Thread creators can manage participants"
ON message_participants FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM message_threads
        WHERE message_threads.id = message_participants.thread_id
        AND message_threads.created_by = auth.uid()
    )
);

-- Allow users to view participant lists for threads they're in
CREATE POLICY "Users can view participants in their threads"
ON message_participants FOR SELECT
USING (
    -- User is the participant
    auth.uid() = user_id OR
    -- User is thread creator
    EXISTS (
        SELECT 1 FROM message_threads
        WHERE message_threads.id = message_participants.thread_id
        AND message_threads.created_by = auth.uid()
    ) OR
    -- User is also a participant in the same thread
    EXISTS (
        SELECT 1 FROM message_participants mp2
        WHERE mp2.thread_id = message_participants.thread_id
        AND mp2.user_id = auth.uid()
    )
);
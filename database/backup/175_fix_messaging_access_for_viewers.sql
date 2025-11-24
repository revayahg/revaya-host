-- Fix messaging access for view-only collaborators
-- Ensure all event participants can access messaging regardless of role

-- Update messaging policies to be more inclusive for event participants
DROP POLICY IF EXISTS "simple_threads_policy" ON message_threads;
DROP POLICY IF EXISTS "simple_messages_policy" ON messages;
DROP POLICY IF EXISTS "simple_participants_policy" ON message_participants;

-- Create more specific policies that check for event access
CREATE POLICY "threads_for_event_participants" ON message_threads
FOR ALL USING (
    auth.uid() IS NOT NULL AND (
        -- User is event owner
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_id 
            AND (e.user_id = auth.uid() OR e.created_by = auth.uid())
        )
        OR
        -- User has any role in the event
        EXISTS (
            SELECT 1 FROM event_user_roles eur 
            WHERE eur.event_id = event_id 
            AND eur.user_id = auth.uid() 
            AND eur.status = 'active'
            AND eur.role IN ('viewer', 'editor', 'admin')
        )
    )
);

CREATE POLICY "messages_for_event_participants" ON messages
FOR ALL USING (
    auth.uid() IS NOT NULL AND (
        -- User is sender
        sender_id = auth.uid()
        OR
        -- User has access to the thread via event participation
        EXISTS (
            SELECT 1 FROM message_threads mt
            JOIN events e ON e.id = mt.event_id
            WHERE mt.id = thread_id 
            AND (e.user_id = auth.uid() OR e.created_by = auth.uid())
        )
        OR
        EXISTS (
            SELECT 1 FROM message_threads mt
            JOIN event_user_roles eur ON eur.event_id = mt.event_id
            WHERE mt.id = thread_id 
            AND eur.user_id = auth.uid() 
            AND eur.status = 'active'
            AND eur.role IN ('viewer', 'editor', 'admin')
        )
    )
);

CREATE POLICY "participants_for_event_members" ON message_participants
FOR ALL USING (
    auth.uid() IS NOT NULL AND (
        -- User is managing their own participation
        user_id = auth.uid()
        OR
        -- User has access to the thread via event participation
        EXISTS (
            SELECT 1 FROM message_threads mt
            JOIN events e ON e.id = mt.event_id
            WHERE mt.id = thread_id 
            AND (e.user_id = auth.uid() OR e.created_by = auth.uid())
        )
        OR
        EXISTS (
            SELECT 1 FROM message_threads mt
            JOIN event_user_roles eur ON eur.event_id = mt.event_id
            WHERE mt.id = thread_id 
            AND eur.user_id = auth.uid() 
            AND eur.status = 'active'
            AND eur.role IN ('viewer', 'editor', 'admin')
        )
    )
);

-- Ensure proper grants for authenticated users
GRANT ALL ON message_threads TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON message_participants TO authenticated;

-- Update the RPC function to handle all event participants
CREATE OR REPLACE FUNCTION create_event_group_thread(p_event_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_thread_id UUID;
    v_thread_record RECORD;
    v_participant RECORD;
    v_result JSON;
BEGIN
    -- Check if thread already exists for this event
    SELECT id INTO v_thread_id
    FROM message_threads 
    WHERE event_id = p_event_id 
    AND subject = 'Event Team Chat'
    LIMIT 1;
    
    -- Create thread if it doesn't exist
    IF v_thread_id IS NULL THEN
        INSERT INTO message_threads (event_id, subject, created_by)
        VALUES (p_event_id, 'Event Team Chat', auth.uid())
        RETURNING id INTO v_thread_id;
    END IF;
    
    -- Get thread details
    SELECT * INTO v_thread_record
    FROM message_threads 
    WHERE id = v_thread_id;
    
    -- Add event owner as participant if not already added
    INSERT INTO message_participants (thread_id, user_id)
    SELECT v_thread_id, e.created_by
    FROM events e
    WHERE e.id = p_event_id 
    AND e.created_by IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM message_participants mp 
        WHERE mp.thread_id = v_thread_id AND mp.user_id = e.created_by
    );
    
    -- Add current user as participant if not already added and they have access
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO message_participants (thread_id, user_id)
        SELECT v_thread_id, auth.uid()
        WHERE NOT EXISTS (
            SELECT 1 FROM message_participants mp 
            WHERE mp.thread_id = v_thread_id AND mp.user_id = auth.uid()
        )
        AND (
            -- User is event owner
            EXISTS (SELECT 1 FROM events e WHERE e.id = p_event_id AND (e.user_id = auth.uid() OR e.created_by = auth.uid()))
            OR
            -- User has any role in event
            EXISTS (SELECT 1 FROM event_user_roles eur WHERE eur.event_id = p_event_id AND eur.user_id = auth.uid() AND eur.status = 'active')
        );
    END IF;
    
    -- Add all event collaborators as participants
    INSERT INTO message_participants (thread_id, user_id)
    SELECT v_thread_id, eur.user_id
    FROM event_user_roles eur
    WHERE eur.event_id = p_event_id 
    AND eur.status = 'active'
    AND eur.role IN ('viewer', 'editor', 'admin')
    AND NOT EXISTS (
        SELECT 1 FROM message_participants mp 
        WHERE mp.thread_id = v_thread_id AND mp.user_id = eur.user_id
    );
    
    -- Build result
    v_result := json_build_object(
        'thread', row_to_json(v_thread_record),
        'participants', (
            SELECT json_agg(json_build_object('user_id', user_id, 'last_read_at', last_read_at))
            FROM message_participants 
            WHERE thread_id = v_thread_id
        )
    );
    
    RETURN v_result;
END;
$$;
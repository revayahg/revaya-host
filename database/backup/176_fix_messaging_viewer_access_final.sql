-- Fix messaging access for all event participants including viewers
-- This addresses the "multiple (or no) rows returned" error

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "threads_for_event_participants" ON message_threads;
DROP POLICY IF EXISTS "messages_for_event_participants" ON messages; 
DROP POLICY IF EXISTS "participants_for_event_members" ON message_participants;

-- Create simple, non-recursive policies for messaging access
CREATE POLICY "enable_all_for_event_participants" ON message_threads
FOR ALL USING (
    auth.uid() IS NOT NULL AND (
        -- Direct event ownership check
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_id 
            AND (e.user_id = auth.uid() OR e.created_by = auth.uid())
        )
        OR
        -- Direct collaboration check without recursion
        EXISTS (
            SELECT 1 FROM event_user_roles eur 
            WHERE eur.event_id = event_id 
            AND eur.user_id = auth.uid() 
            AND eur.status = 'active'
        )
    )
);

CREATE POLICY "enable_all_for_thread_participants" ON messages
FOR ALL USING (
    auth.uid() IS NOT NULL AND (
        sender_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM message_threads mt
            WHERE mt.id = thread_id 
            AND (
                EXISTS (
                    SELECT 1 FROM events e 
                    WHERE e.id = mt.event_id 
                    AND (e.user_id = auth.uid() OR e.created_by = auth.uid())
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
    )
);

CREATE POLICY "enable_all_for_participants" ON message_participants
FOR ALL USING (
    auth.uid() IS NOT NULL AND (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM message_threads mt
            WHERE mt.id = thread_id 
            AND (
                EXISTS (
                    SELECT 1 FROM events e 
                    WHERE e.id = mt.event_id 
                    AND (e.user_id = auth.uid() OR e.created_by = auth.uid())
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
    )
);

-- Recreate the RPC function with better error handling and single return
CREATE OR REPLACE FUNCTION create_event_group_thread(p_event_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_thread_id UUID;
    v_thread_record RECORD;
    v_result JSON;
    v_current_user UUID;
BEGIN
    -- Get current user
    v_current_user := auth.uid();
    
    -- Verify user has access to this event
    IF NOT EXISTS (
        SELECT 1 FROM events e 
        WHERE e.id = p_event_id 
        AND (e.user_id = v_current_user OR e.created_by = v_current_user)
        UNION ALL
        SELECT 1 FROM event_user_roles eur 
        WHERE eur.event_id = p_event_id 
        AND eur.user_id = v_current_user 
        AND eur.status = 'active'
    ) THEN
        RAISE EXCEPTION 'User does not have access to this event';
    END IF;
    
    -- Check if thread already exists for this event
    SELECT id INTO v_thread_id
    FROM message_threads 
    WHERE event_id = p_event_id 
    AND subject = 'Event Team Chat'
    LIMIT 1;
    
    -- Create thread if it doesn't exist
    IF v_thread_id IS NULL THEN
        INSERT INTO message_threads (event_id, subject, created_by)
        VALUES (p_event_id, 'Event Team Chat', v_current_user)
        RETURNING id INTO v_thread_id;
    END IF;
    
    -- Get thread details
    SELECT * INTO v_thread_record
    FROM message_threads 
    WHERE id = v_thread_id;
    
    -- Add event owner as participant
    INSERT INTO message_participants (thread_id, user_id)
    SELECT v_thread_id, e.created_by
    FROM events e
    WHERE e.id = p_event_id 
    AND e.created_by IS NOT NULL
    ON CONFLICT (thread_id, user_id) DO NOTHING;
    
    -- Add current user as participant
    INSERT INTO message_participants (thread_id, user_id)
    VALUES (v_thread_id, v_current_user)
    ON CONFLICT (thread_id, user_id) DO NOTHING;
    
    -- Add all active event collaborators as participants
    INSERT INTO message_participants (thread_id, user_id)
    SELECT v_thread_id, eur.user_id
    FROM event_user_roles eur
    WHERE eur.event_id = p_event_id 
    AND eur.status = 'active'
    ON CONFLICT (thread_id, user_id) DO NOTHING;
    
    -- Build result as single JSON object
    SELECT json_build_object(
        'thread', json_build_object(
            'id', v_thread_record.id,
            'event_id', v_thread_record.event_id,
            'subject', v_thread_record.subject,
            'created_at', v_thread_record.created_at,
            'created_by', v_thread_record.created_by,
            'last_message_at', v_thread_record.last_message_at,
            'last_message_preview', v_thread_record.last_message_preview
        ),
        'participants', COALESCE((
            SELECT json_agg(json_build_object('user_id', user_id, 'last_read_at', last_read_at))
            FROM message_participants 
            WHERE thread_id = v_thread_id
        ), '[]'::json)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_event_group_thread(UUID) TO authenticated;
GRANT ALL ON message_threads TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON message_participants TO authenticated;
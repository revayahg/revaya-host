-- ===================================================================
-- Messaging System V2 - RPC Functions
-- ===================================================================

-- ===================================================================
-- Function: create_event_group_thread
-- Purpose: Ensure event group thread exists and add all event participants
-- Returns: { thread: {}, participants: [] }
-- ===================================================================
CREATE OR REPLACE FUNCTION create_event_group_thread(p_event_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_thread message_threads%ROWTYPE;
    v_participant_count INTEGER;
    v_result JSON;
BEGIN
    -- Check if user has access to this event
    IF NOT EXISTS (
        SELECT 1 FROM event_user_roles eur
        WHERE eur.event_id = p_event_id
        AND eur.user_id = auth.uid()
        AND eur.status = 'active'
        
        UNION
        
        SELECT 1 FROM event_vendors ev
        JOIN vendor_profiles vp ON ev.vendor_id = vp.id
        WHERE ev.event_id = p_event_id
        AND vp.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied to event';
    END IF;

    -- Get or create thread
    SELECT * INTO v_thread
    FROM message_threads
    WHERE event_id = p_event_id;
    
    IF NOT FOUND THEN
        INSERT INTO message_threads (event_id, subject)
        VALUES (p_event_id, 'Event Team Chat')
        RETURNING * INTO v_thread;
    END IF;

    -- Add event owner/collaborators as participants
    INSERT INTO message_participants (thread_id, user_id)
    SELECT v_thread.id, eur.user_id
    FROM event_user_roles eur
    WHERE eur.event_id = p_event_id
    AND eur.status = 'active'
    ON CONFLICT (thread_id, user_id) DO NOTHING;

    -- Add assigned vendors as participants
    INSERT INTO message_participants (thread_id, user_id)
    SELECT v_thread.id, vp.user_id
    FROM event_vendors ev
    JOIN vendor_profiles vp ON ev.vendor_id = vp.id
    WHERE ev.event_id = p_event_id
    ON CONFLICT (thread_id, user_id) DO NOTHING;

    -- Get participant count
    SELECT COUNT(*) INTO v_participant_count
    FROM message_participants
    WHERE thread_id = v_thread.id;

    -- Build result JSON
    v_result := json_build_object(
        'thread', row_to_json(v_thread),
        'participant_count', v_participant_count
    );

    RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_event_group_thread(UUID) TO authenticated;
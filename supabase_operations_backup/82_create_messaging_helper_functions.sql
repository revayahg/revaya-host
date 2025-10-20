-- Helper functions for the messaging system

-- Function to create a new message thread with participants
CREATE OR REPLACE FUNCTION create_message_thread(
    p_event_id TEXT,
    p_subject TEXT,
    p_recipient_user_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_thread_id UUID;
    v_user_id UUID;
BEGIN
    -- Create the thread
    INSERT INTO message_threads (event_id, subject, created_by)
    VALUES (p_event_id, p_subject, auth.uid())
    RETURNING id INTO v_thread_id;
    
    -- Add recipients as participants
    FOREACH v_user_id IN ARRAY p_recipient_user_ids
    LOOP
        INSERT INTO message_participants (thread_id, user_id, participant_type, vendor_profile_id)
        VALUES (
            v_thread_id, 
            v_user_id, 
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM vendor_profiles 
                    WHERE user_id = v_user_id
                ) THEN 'vendor'
                ELSE 'planner'
            END,
            (SELECT id FROM vendor_profiles WHERE user_id = v_user_id LIMIT 1)
        )
        ON CONFLICT (thread_id, user_id) DO NOTHING;
    END LOOP;
    
    RETURN v_thread_id;
END;
$$;

-- Function to get assigned vendors for an event (for messaging recipients)
CREATE OR REPLACE FUNCTION get_event_messaging_recipients(p_event_id TEXT)
RETURNS TABLE (
    user_id UUID,
    vendor_profile_id UUID,
    name TEXT,
    company TEXT,
    participant_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vp.user_id,
        vp.id as vendor_profile_id,
        COALESCE(vp.name, vp.company, 'Unknown') as name,
        vp.company,
        'vendor'::TEXT as participant_type
    FROM event_invitations ei
    JOIN vendor_profiles vp ON vp.id = ei.vendor_profile_id
    WHERE ei.event_id = p_event_id
    AND ei.response = 'accepted'
    AND vp.user_id IS NOT NULL
    
    UNION ALL
    
    -- Include event planner
    SELECT 
        e.user_id,
        NULL::UUID as vendor_profile_id,
        COALESCE(p.display_name, p.email, 'Event Planner') as name,
        NULL::TEXT as company,
        'planner'::TEXT as participant_type
    FROM events e
    LEFT JOIN profiles p ON p.id = e.user_id
    WHERE e.id::TEXT = p_event_id;
END;
$$;

-- Function to send a message (creates thread if needed)
CREATE OR REPLACE FUNCTION send_message(
    p_event_id TEXT,
    p_recipient_user_id UUID,
    p_content TEXT,
    p_subject TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_thread_id UUID;
    v_message_id UUID;
BEGIN
    -- Try to find existing thread between these users for this event
    SELECT mt.id INTO v_thread_id
    FROM message_threads mt
    JOIN message_participants mp1 ON mp1.thread_id = mt.id
    JOIN message_participants mp2 ON mp2.thread_id = mt.id
    WHERE mt.event_id = p_event_id
    AND mp1.user_id = auth.uid()
    AND mp2.user_id = p_recipient_user_id
    AND mt.is_active = true
    LIMIT 1;
    
    -- If no thread exists, create one
    IF v_thread_id IS NULL THEN
        v_thread_id := create_message_thread(
            p_event_id,
            COALESCE(p_subject, 'Event Discussion'),
            ARRAY[p_recipient_user_id]
        );
    END IF;
    
    -- Insert the message
    INSERT INTO messages (thread_id, event_id, sender_id, content, sender_type)
    VALUES (
        v_thread_id,
        p_event_id,
        auth.uid(),
        p_content,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM vendor_profiles 
                WHERE user_id = auth.uid()
            ) THEN 'vendor'
            ELSE 'planner'
        END
    )
    RETURNING id INTO v_message_id;
    
    RETURN v_message_id;
END;
$$;
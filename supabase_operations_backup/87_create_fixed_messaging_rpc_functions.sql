-- Create fixed messaging RPC functions with correct data types

-- Function to send a message (creates thread if needed, event-scoped)
CREATE OR REPLACE FUNCTION send_message(
    p_event_id TEXT,
    p_recipient_vendor_profile_id UUID,
    p_content TEXT,
    p_subject TEXT DEFAULT 'Event Discussion'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_thread_id UUID;
    v_message_id UUID;
    v_sender_vendor_profile_id TEXT;
    v_current_user_id UUID;
    v_recipient_id_text TEXT;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();
    
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Convert recipient UUID to TEXT for consistent storage
    v_recipient_id_text := p_recipient_vendor_profile_id::TEXT;

    -- Check if sender has vendor profile for this event
    SELECT vp.id::TEXT INTO v_sender_vendor_profile_id
    FROM vendor_profiles vp
    WHERE vp.user_id = v_current_user_id
    LIMIT 1;

    -- Try to find existing thread for this event and vendor profile
    SELECT id INTO v_thread_id
    FROM message_threads
    WHERE event_id = p_event_id
    AND vendor_profile_id = v_recipient_id_text
    AND is_active = true
    LIMIT 1;

    -- Create new thread if none exists
    IF v_thread_id IS NULL THEN
        INSERT INTO message_threads (event_id, vendor_profile_id, subject, created_by, is_active)
        VALUES (p_event_id, v_recipient_id_text, p_subject, v_current_user_id, true)
        RETURNING id INTO v_thread_id;
        
        RAISE NOTICE 'Created new thread % for event % and vendor %', v_thread_id, p_event_id, v_recipient_id_text;
    ELSE
        RAISE NOTICE 'Using existing thread % for event % and vendor %', v_thread_id, p_event_id, v_recipient_id_text;
    END IF;

    -- Insert the message
    INSERT INTO messages (
        thread_id, 
        event_id, 
        sender_vendor_profile_id, 
        content, 
        sender_type,
        sender_id
    )
    VALUES (
        v_thread_id, 
        p_event_id, 
        v_sender_vendor_profile_id, 
        p_content, 
        CASE WHEN v_sender_vendor_profile_id IS NOT NULL THEN 'vendor' ELSE 'planner' END,
        v_current_user_id
    )
    RETURNING id INTO v_message_id;

    -- Update thread timestamp
    UPDATE message_threads 
    SET updated_at = NOW() 
    WHERE id = v_thread_id;

    RAISE NOTICE 'Created message % in thread %', v_message_id, v_thread_id;
    
    RETURN v_message_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_message(TEXT, UUID, TEXT, TEXT) TO authenticated;
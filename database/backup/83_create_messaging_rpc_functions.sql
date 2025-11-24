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
    v_sender_vendor_profile_id UUID;
    v_current_user_id UUID;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();
    
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Check if sender has vendor profile for this event
    SELECT vp.id INTO v_sender_vendor_profile_id
    FROM vendor_profiles vp
    WHERE vp.user_id = v_current_user_id
    LIMIT 1;

    -- Try to find existing thread for this event and vendor profile
    -- Convert UUID to TEXT for comparison to ensure type consistency
    SELECT id INTO v_thread_id
    FROM message_threads
    WHERE event_id = p_event_id
    AND vendor_profile_id::TEXT = p_recipient_vendor_profile_id::TEXT
    AND is_active = true
    LIMIT 1;

    -- Create new thread if none exists
    IF v_thread_id IS NULL THEN
        INSERT INTO message_threads (event_id, vendor_profile_id, subject, created_by, is_active)
        VALUES (p_event_id, p_recipient_vendor_profile_id::TEXT, p_subject, v_current_user_id, true)
        RETURNING id INTO v_thread_id;
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

    RETURN v_message_id;
END;
$$;>>>>>>> REPLACE
-- Create RPC functions for messaging system

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_event_messaging_recipients(TEXT);
DROP FUNCTION IF EXISTS send_message(TEXT, UUID, TEXT, TEXT);

-- Function to get messaging recipients for an event (keyed by vendor_profile_id)
CREATE OR REPLACE FUNCTION get_event_messaging_recipients(p_event_id TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    participant_type TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return all vendor profiles assigned to this event (one row per vendor profile)
    RETURN QUERY
    SELECT 
        COALESCE(ei.vendor_profile_id, vp.id) as id,
        COALESCE(vp.company, vp.name, ei.vendor_name, 'Unknown Vendor') as name,
        'vendor'::TEXT as participant_type
    FROM event_invitations ei
    LEFT JOIN vendor_profiles vp ON vp.id = ei.vendor_profile_id
    WHERE ei.event_id = p_event_id 
    AND ei.response = 'accepted'
    AND (ei.vendor_profile_id IS NOT NULL OR vp.id IS NOT NULL);
END;
$$;

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
    v_sender_vendor_profile_id UUID;
    v_current_user_id UUID;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();
    
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Check if sender has vendor profile for this event
    SELECT vp.id INTO v_sender_vendor_profile_id
    FROM vendor_profiles vp
    WHERE vp.user_id = v_current_user_id
    LIMIT 1;

    -- Try to find existing thread for this event and vendor profile
    SELECT id INTO v_thread_id
    FROM message_threads
    WHERE event_id = p_event_id
    AND vendor_profile_id = p_recipient_vendor_profile_id
    AND is_active = true
    LIMIT 1;

    -- Create new thread if none exists
    IF v_thread_id IS NULL THEN
        INSERT INTO message_threads (event_id, vendor_profile_id, subject, created_by)
        VALUES (p_event_id, p_recipient_vendor_profile_id, p_subject, v_current_user_id)
        RETURNING id INTO v_thread_id;
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

    RETURN v_message_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_event_messaging_recipients(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_message(TEXT, UUID, TEXT, TEXT) TO authenticated;

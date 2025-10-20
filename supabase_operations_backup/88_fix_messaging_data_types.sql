-- Fix messaging data type inconsistencies and add debugging

-- First, let's check what's actually in our tables
-- This will help us understand the data type issues

-- Drop and recreate the send_message function with proper debugging
DROP FUNCTION IF EXISTS send_message(TEXT, UUID, TEXT, TEXT);

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

    RAISE NOTICE 'send_message: Starting with event_id=%, recipient_vendor_id=%, user_id=%', 
        p_event_id, v_recipient_id_text, v_current_user_id;

    -- Check if sender has vendor profile for this event
    SELECT vp.id::TEXT INTO v_sender_vendor_profile_id
    FROM vendor_profiles vp
    WHERE vp.user_id = v_current_user_id
    LIMIT 1;

    RAISE NOTICE 'send_message: Sender vendor profile ID=%', v_sender_vendor_profile_id;

    -- Try to find existing thread for this event and vendor profile
    SELECT id INTO v_thread_id
    FROM message_threads
    WHERE event_id = p_event_id
    AND vendor_profile_id = v_recipient_id_text
    AND is_active = true
    LIMIT 1;

    RAISE NOTICE 'send_message: Found existing thread=%', v_thread_id;

    -- Create new thread if none exists
    IF v_thread_id IS NULL THEN
        INSERT INTO message_threads (event_id, vendor_profile_id, subject, created_by, is_active)
        VALUES (p_event_id, v_recipient_id_text, p_subject, v_current_user_id, true)
        RETURNING id INTO v_thread_id;
        
        RAISE NOTICE 'send_message: Created new thread=%', v_thread_id;
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

    RAISE NOTICE 'send_message: Created message=% in thread=%', v_message_id, v_thread_id;
    
    RETURN v_message_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_message(TEXT, UUID, TEXT, TEXT) TO authenticated;

-- Create debug function to check table contents
CREATE OR REPLACE FUNCTION debug_messaging_tables(p_event_id TEXT)
RETURNS TABLE(
    table_name TEXT,
    record_count BIGINT,
    sample_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check message_threads
    RETURN QUERY
    SELECT 
        'message_threads'::TEXT,
        COUNT(*)::BIGINT,
        COALESCE(jsonb_agg(to_jsonb(mt.*)), '[]'::jsonb)
    FROM message_threads mt
    WHERE mt.event_id = p_event_id;

    -- Check messages
    RETURN QUERY
    SELECT 
        'messages'::TEXT,
        COUNT(*)::BIGINT,
        COALESCE(jsonb_agg(to_jsonb(m.*)), '[]'::jsonb)
    FROM messages m
    WHERE m.event_id = p_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION debug_messaging_tables(TEXT) TO authenticated;
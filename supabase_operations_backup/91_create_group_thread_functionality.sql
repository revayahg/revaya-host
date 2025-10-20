-- Create functionality for "All Event Participants" group threads
-- This enables group messaging between event planners and all accepted vendors

-- Function to get or create the "all_participants" group thread for an event
CREATE OR REPLACE FUNCTION get_or_create_group_thread(p_event_id TEXT)
RETURNS TEXT AS $$
DECLARE
    thread_id TEXT;
    event_creator_id UUID;
    vendor_record RECORD;
BEGIN
    -- Check if group thread already exists
    SELECT id INTO thread_id
    FROM message_threads
    WHERE event_id = p_event_id AND subject = 'all_participants';
    
    -- If thread exists, return it
    IF thread_id IS NOT NULL THEN
        RETURN thread_id;
    END IF;
    
    -- Create new group thread
    INSERT INTO message_threads (id, event_id, subject, created_at, updated_at)
    VALUES (gen_random_uuid()::text, p_event_id, 'all_participants', NOW(), NOW())
    RETURNING id INTO thread_id;
    
    -- Get event creator
    SELECT creator_id INTO event_creator_id
    FROM events
    WHERE id = p_event_id;
    
    -- Add event creator to participants
    IF event_creator_id IS NOT NULL THEN
        INSERT INTO message_participants (thread_id, vendor_profile_id, joined_at)
        VALUES (thread_id, event_creator_id::text, NOW());
    END IF;
    
    -- Add all accepted vendors to participants
    FOR vendor_record IN
        SELECT DISTINCT ei.vendor_profile_id
        FROM event_invitations ei
        WHERE ei.event_id = p_event_id 
        AND ei.response = 'accepted'
        AND ei.vendor_profile_id IS NOT NULL
    LOOP
        INSERT INTO message_participants (thread_id, vendor_profile_id, joined_at)
        VALUES (thread_id, vendor_record.vendor_profile_id, NOW())
        ON CONFLICT (thread_id, vendor_profile_id) DO NOTHING;
    END LOOP;
    
    RETURN thread_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add a vendor to existing group thread (called when vendor accepts invitation)
CREATE OR REPLACE FUNCTION add_vendor_to_group_thread(p_event_id TEXT, p_vendor_profile_id TEXT)
RETURNS VOID AS $$
DECLARE
    thread_id TEXT;
BEGIN
    -- Find existing group thread for this event
    SELECT id INTO thread_id
    FROM message_threads
    WHERE event_id = p_event_id AND subject = 'all_participants';
    
    -- If group thread exists, add vendor to participants
    IF thread_id IS NOT NULL THEN
        INSERT INTO message_participants (thread_id, vendor_profile_id, joined_at)
        VALUES (thread_id, p_vendor_profile_id, NOW())
        ON CONFLICT (thread_id, vendor_profile_id) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Update send_message function to handle group threads
CREATE OR REPLACE FUNCTION send_message(
    p_event_id TEXT,
    p_sender_vendor_profile_id TEXT,
    p_recipient_id TEXT,
    p_subject TEXT,
    p_content TEXT
) RETURNS TEXT AS $$
DECLARE
    thread_id TEXT;
    message_id TEXT;
BEGIN
    -- Handle "all_participants" group thread
    IF p_recipient_id = 'all_participants' THEN
        thread_id := get_or_create_group_thread(p_event_id);
        
        -- Ensure sender is in the group thread participants
        INSERT INTO message_participants (thread_id, vendor_profile_id, joined_at)
        VALUES (thread_id, p_sender_vendor_profile_id, NOW())
        ON CONFLICT (thread_id, vendor_profile_id) DO NOTHING;
        
    ELSE
        -- Handle regular 1:1 threads (existing logic)
        SELECT id INTO thread_id
        FROM message_threads
        WHERE event_id = p_event_id 
        AND subject = p_subject
        AND EXISTS (
            SELECT 1 FROM message_participants mp1 
            WHERE mp1.thread_id = message_threads.id 
            AND mp1.vendor_profile_id = p_sender_vendor_profile_id
        )
        AND EXISTS (
            SELECT 1 FROM message_participants mp2 
            WHERE mp2.thread_id = message_threads.id 
            AND mp2.vendor_profile_id = p_recipient_id
        );
        
        -- Create thread if it doesn't exist
        IF thread_id IS NULL THEN
            INSERT INTO message_threads (id, event_id, subject, created_at, updated_at)
            VALUES (gen_random_uuid()::text, p_event_id, p_subject, NOW(), NOW())
            RETURNING id INTO thread_id;
            
            -- Add participants
            INSERT INTO message_participants (thread_id, vendor_profile_id, joined_at)
            VALUES 
                (thread_id, p_sender_vendor_profile_id, NOW()),
                (thread_id, p_recipient_id, NOW());
        END IF;
    END IF;
    
    -- Insert message
    INSERT INTO messages (id, thread_id, sender_vendor_profile_id, content, created_at)
    VALUES (gen_random_uuid()::text, thread_id, p_sender_vendor_profile_id, p_content, NOW())
    RETURNING id INTO message_id;
    
    -- Update thread timestamp
    UPDATE message_threads 
    SET updated_at = NOW() 
    WHERE id = thread_id;
    
    RETURN message_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically add vendors to group thread when they accept invitations
CREATE OR REPLACE FUNCTION auto_add_vendor_to_group_thread()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when response changes to 'accepted'
    IF NEW.response = 'accepted' AND (OLD.response IS NULL OR OLD.response != 'accepted') THEN
        -- Add vendor to group thread if it exists
        PERFORM add_vendor_to_group_thread(NEW.event_id, NEW.vendor_profile_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on event_invitations table
DROP TRIGGER IF EXISTS trigger_auto_add_vendor_to_group_thread ON event_invitations;
CREATE TRIGGER trigger_auto_add_vendor_to_group_thread
    AFTER UPDATE ON event_invitations
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_vendor_to_group_thread();

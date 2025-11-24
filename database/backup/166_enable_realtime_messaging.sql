-- ===================================================================
-- Messaging System V2 - Enable Realtime
-- ===================================================================

-- Enable realtime for messaging tables
ALTER PUBLICATION supabase_realtime ADD TABLE message_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_participants;

-- Create trigger to update thread preview when new message is sent
CREATE OR REPLACE FUNCTION update_thread_preview()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update thread's last message info
    UPDATE message_threads
    SET 
        last_message_at = NEW.created_at,
        last_message_preview = CASE 
            WHEN LENGTH(TRIM(NEW.body)) <= 140 THEN TRIM(NEW.body)
            ELSE SUBSTRING(TRIM(NEW.body) FROM 1 FOR 137) || '…'
        END
    WHERE id = NEW.thread_id;
    
    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_thread_preview ON messages;
CREATE TRIGGER trigger_update_thread_preview
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_thread_preview();

-- Create function to clean old messages (12+ months)
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM messages 
    WHERE created_at < (NOW() - INTERVAL '12 months');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION cleanup_old_messages() TO authenticated;
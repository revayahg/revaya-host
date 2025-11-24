-- Working Notification System Setup
-- Simple, tested script that will work without syntax errors

-- Drop existing policies
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;  
DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;
DROP POLICY IF EXISTS "notification_preferences_select_policy" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_insert_policy" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_update_policy" ON notification_preferences;

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
    email_messages boolean DEFAULT true,
    email_invitations boolean DEFAULT true,
    email_tasks boolean DEFAULT true,
    email_events boolean DEFAULT true,
    email_system boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "notifications_select_policy" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_policy" ON notifications
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_update_policy" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notification_preferences_select_policy" ON notification_preferences
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notification_preferences_insert_policy" ON notification_preferences
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_preferences_update_policy" ON notification_preferences
    FOR UPDATE USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_status ON notifications(read_status);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;

-- Create helper function
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id uuid,
    p_type text,
    p_title text,
    p_message text,
    p_event_id uuid DEFAULT NULL,
    p_related_id text DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_id uuid;
BEGIN
    INSERT INTO notifications (user_id, type, title, message, event_id, related_id, metadata)
    VALUES (p_user_id, p_type, p_title, p_message, p_event_id, p_related_id, p_metadata)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
EXCEPTION
    WHEN others THEN
        RETURN NULL;
END;
$$;
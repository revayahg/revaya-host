-- Comprehensive Notification System Fix
-- This script fixes all notification system issues in one go

-- Step 1: Drop existing notification policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "notification_select_policy" ON notifications;
DROP POLICY IF EXISTS "notification_insert_policy" ON notifications;
DROP POLICY IF EXISTS "notification_update_policy" ON notifications;

-- Step 2: Verify existing notifications table structure (table already exists)
-- The notifications table already exists with the correct structure
-- Just ensure the notification_preferences table exists
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

-- Step 3: Enable RLS on both tables (notifications table already exists)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Step 5: Create simple, working RLS policies for notifications
CREATE POLICY "notifications_select_policy" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_policy" ON notifications
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_update_policy" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Step 5: Create RLS policies for notification preferences
CREATE POLICY "notification_preferences_select_policy" ON notification_preferences
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notification_preferences_insert_policy" ON notification_preferences
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_preferences_update_policy" ON notification_preferences
    FOR UPDATE USING (user_id = auth.uid());

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_status ON notifications(read_status);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Step 7: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;

-- Step 8: Create function to safely create notifications
CREATE OR REPLACE FUNCTION create_notification_safe(
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
    -- Validate input
    IF p_user_id IS NULL OR p_type IS NULL OR p_title IS NULL OR p_message IS NULL THEN
        RAISE EXCEPTION 'Required fields cannot be null';
    END IF;

    -- Insert notification
    INSERT INTO notifications (
        user_id, type, title, message, event_id, related_id, metadata
    ) VALUES (
        p_user_id, p_type, p_title, p_message, p_event_id, p_related_id, p_metadata
    ) RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$;

-- Step 9: Create function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE notifications 
    SET read_status = true, is_read = true, updated_at = now()
    WHERE id = notification_id AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

-- Step 10: Test the notification system
DO $$
DECLARE
    test_user_id uuid;
    test_notification_id uuid;
BEGIN
    -- Try to get the current user (if authenticated)
    SELECT auth.uid() INTO test_user_id;
    
    IF test_user_id IS NOT NULL THEN
        -- Create a test notification
        SELECT create_notification_safe(
            test_user_id,
            'test',
            'System Test',
            'Notification system is working correctly',
            NULL,
            'test_' || extract(epoch from now())::text,
            '{"test": true}'::jsonb
        ) INTO test_notification_id;
        
        RAISE NOTICE 'Test notification created with ID: %', test_notification_id;
    ELSE
        RAISE NOTICE 'No authenticated user - skipping test notification creation';
    END IF;
END;
$$;

-- Final verification query
SELECT 
    'Notifications table exists' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') 
         THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
    'Notification preferences table exists',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') 
         THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 
    'RLS enabled on notifications',
    CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'notifications') 
         THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 
    'create_notification_safe function exists',
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_notification_safe') 
         THEN 'PASS' ELSE 'FAIL' END;

RAISE NOTICE 'Comprehensive notification system setup complete!';
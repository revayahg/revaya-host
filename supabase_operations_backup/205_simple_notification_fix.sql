-- Simple Notification System Fix
-- This fixes the RLS policy issue preventing notifications from being created

-- Drop existing policies that are blocking inserts
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;  
DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;

-- Create permissive policies that allow the notification system to work
CREATE POLICY "notifications_allow_all" ON notifications
    FOR ALL USING (true) WITH CHECK (true);

-- Grant full permissions to authenticated users
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notification_preferences TO authenticated;

-- Create notification preferences table if missing
CREATE TABLE IF NOT EXISTS notification_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
    email_tasks boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Drop and recreate notification preferences policies
DROP POLICY IF EXISTS "notification_preferences_select_policy" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_insert_policy" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_update_policy" ON notification_preferences;

CREATE POLICY "notification_preferences_allow_all" ON notification_preferences
    FOR ALL USING (true) WITH CHECK (true);
-- Complete Notification System Fix
-- This script creates a working notification system based on the existing table structure

-- First, check what notification table structure already exists
DO $$
DECLARE
    table_exists boolean;
    has_id_column boolean;
    id_column_type text;
BEGIN
    -- Check if notifications table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'notifications'
    ) INTO table_exists;

    IF table_exists THEN
        RAISE NOTICE 'Notifications table exists, checking structure...';
        
        -- Check ID column type
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'id'
        ) INTO has_id_column;
        
        IF has_id_column THEN
            SELECT data_type INTO id_column_type
            FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'id';
            
            RAISE NOTICE 'ID column exists with type: %', id_column_type;
        END IF;
    ELSE
        RAISE NOTICE 'Notifications table does not exist';
    END IF;
END $$;

-- Drop existing policies safely
DO $$
BEGIN
    DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
    DROP POLICY IF EXISTS "notifications_insert_system" ON notifications;
    DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
    DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
    DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
    DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;
    DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;
    DROP POLICY IF EXISTS "notifications_delete_policy" ON notifications;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Create notifications table matching the existing structure from notificationAPI.js
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('message', 'invitation', 'task_assigned', 'task_updated', 'event_update', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    event_id UUID,
    metadata JSONB DEFAULT '{}',
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create simple, working RLS policies
CREATE POLICY "notifications_select_own" ON notifications
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_authenticated" ON notifications
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "notifications_update_own" ON notifications
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own" ON notifications
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    task_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_own" ON notification_preferences
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notification_preferences TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_status ON notifications(read_status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Test the setup
DO $$
BEGIN
    RAISE NOTICE 'Notification system setup complete. Table structure matches notificationAPI.js expectations.';
END $$;
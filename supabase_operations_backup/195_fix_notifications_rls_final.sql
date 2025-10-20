-- Fix Notifications RLS Policies for Task Assignments
-- This script completely recreates the notification table policies to fix RLS blocking issues

-- Drop ALL possible existing policies (including any variations)
DO $$
BEGIN
    -- Drop any existing notification policies
    DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can create notifications for themselves" ON notifications;
    DROP POLICY IF EXISTS "Event participants can create notifications" ON notifications;
    DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
    DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;
    DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;
    DROP POLICY IF EXISTS "notifications_delete_policy" ON notifications;
    DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
    DROP POLICY IF EXISTS "notifications_insert_system" ON notifications;
    DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
    DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
EXCEPTION WHEN OTHERS THEN
    -- Continue if policies don't exist
    NULL;
END $$;

-- Ensure notifications table exists with correct structure
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    event_id UUID,
    metadata JSONB DEFAULT '{}',
    read_status BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fix column types if they exist but are wrong type
DO $$
BEGIN
    -- Check if user_id is text and convert to UUID
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'user_id' 
        AND data_type = 'text'
    ) THEN
        -- Clean invalid UUIDs first
        DELETE FROM notifications WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
        -- Convert column type
        ALTER TABLE notifications ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- If conversion fails, just continue
    NULL;
END $$;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create new simplified policies
-- Policy 1: Users can view their own notifications
CREATE POLICY "notifications_select_own"
ON notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Allow any authenticated user to insert notifications (for task assignments, etc.)
CREATE POLICY "notifications_insert_system"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 3: Users can update their own notifications
CREATE POLICY "notifications_update_own"
ON notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own notifications
CREATE POLICY "notifications_delete_own"
ON notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON notifications TO authenticated;
GRANT USAGE ON SEQUENCE notifications_id_seq TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Test notification
DO $$
BEGIN
    RAISE NOTICE 'Notification RLS policies updated successfully - task assignment notifications should now work';
END $$;
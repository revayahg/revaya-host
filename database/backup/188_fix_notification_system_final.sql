-- Fix Notifications Table RLS Policies for Task Assignment
-- This script allows authenticated users to create notifications for other users
-- while maintaining security by restricting read access to the notification recipient

-- First, drop existing policies on notifications table if they exist
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON notifications;

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    type TEXT NOT NULL CHECK (type IN ('task_assigned', 'task_updated', 'task_completed', 'collaborator_invited', 'event_updated')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    event_id UUID REFERENCES events(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add is_read column if it doesn't exist (fallback for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'is_read'
    ) THEN
        ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create notification_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    task_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- INSERT Policy: Allow authenticated users to create notifications for themselves or event collaborators
CREATE POLICY "notifications_insert_policy" ON notifications
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated' 
        AND (
            -- Allow users to create notifications for themselves
            auth.uid() = user_id
            OR
            -- Allow users to create notifications for other users if they're both collaborators on the same event
            (
                event_id IS NOT NULL 
                AND EXISTS (
                    SELECT 1 FROM event_user_roles eur1
                    WHERE eur1.event_id = event_id 
                    AND eur1.user_id = auth.uid()
                    AND eur1.status IN ('active', 'invited')
                )
                AND EXISTS (
                    SELECT 1 FROM event_user_roles eur2
                    WHERE eur2.event_id = event_id 
                    AND eur2.user_id = user_id
                    AND eur2.status IN ('active', 'invited')
                )
            )
        )
    );

-- SELECT Policy: Users can only read their own notifications
CREATE POLICY "notifications_select_policy" ON notifications
    FOR SELECT 
    USING (auth.uid() = user_id);

-- UPDATE Policy: Users can only update their own notifications (mark as read, etc.)
CREATE POLICY "notifications_update_policy" ON notifications
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE Policy: Users can only delete their own notifications
CREATE POLICY "notifications_delete_policy" ON notifications
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Notification Preferences Policies
DROP POLICY IF EXISTS "notification_preferences_all_policy" ON notification_preferences;
CREATE POLICY "notification_preferences_all_policy" ON notification_preferences
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Add update trigger for updated_at column
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

-- Grant necessary permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notification_preferences TO authenticated;

-- Verify the setup with some test queries (commented out for production)
-- SELECT * FROM pg_policies WHERE tablename = 'notifications';
-- SELECT * FROM information_schema.table_constraints WHERE table_name = 'notifications';

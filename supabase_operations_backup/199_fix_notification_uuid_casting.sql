-- Fix UUID type casting errors in notification RLS policies
-- This addresses the "operator does not exist: uuid = text" error

-- Disable RLS temporarily to make changes
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "notification_select_policy" ON notifications;
DROP POLICY IF EXISTS "notification_insert_policy" ON notifications;  
DROP POLICY IF EXISTS "notification_update_policy" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow task assignment notifications" ON notifications;

-- Check the actual column types first
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND column_name IN ('user_id', 'event_id', 'created_by');

-- Create policies with proper type casting
CREATE POLICY "notification_select_policy" ON notifications
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid()::text);

CREATE POLICY "notification_update_policy" ON notifications
FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- Simple insert policy that allows all authenticated users
CREATE POLICY "notification_insert_policy" ON notifications
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Ensure proper permissions
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE notifications_id_seq TO authenticated;
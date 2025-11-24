-- Fix notification RLS policies to allow task assignment notifications
-- This addresses the "new row violates row-level security policy" error

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow task assignment notifications" ON notifications;
DROP POLICY IF EXISTS "Allow notification creation for events" ON notifications;

-- Create comprehensive notification policies
CREATE POLICY "Users can view their own notifications" ON notifications
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- Allow task assignment notifications - users can create notifications for other users in events they participate in
CREATE POLICY "Allow task assignment notifications" ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can create notifications for events they are part of
  EXISTS (
    SELECT 1 FROM event_user_roles eur
    WHERE eur.event_id = notifications.event_id
    AND eur.user_id = auth.uid()::text
    AND eur.status = 'active'
  )
  OR
  -- User can create notifications for events they own
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = notifications.event_id
    AND e.created_by = auth.uid()
  )
);

-- Allow users to create notifications for themselves
CREATE POLICY "Users can create their own notifications" ON notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

-- Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT USAGE ON SEQUENCE notifications_id_seq TO authenticated;
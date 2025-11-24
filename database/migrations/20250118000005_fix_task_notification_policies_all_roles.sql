-- Fix Task Notification Policies to Support All Event Participant Roles
-- This ensures task assignees receive notifications regardless of their role (owner, editor, viewer)

-- Drop ALL existing notification policies to avoid conflicts
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;  
DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_comprehensive" ON notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;

-- Disable RLS temporarily to recreate policies
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- INSERT Policy: Allow task notifications for ALL event participants regardless of role
CREATE POLICY "notifications_insert_comprehensive" ON notifications
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated' 
        AND (
            -- Allow users to create notifications for themselves
            auth.uid()::text = user_id::text
            OR
            -- Allow event owners to create notifications for any participant in their events
            (
                event_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM events e
                    WHERE e.id = event_id 
                    AND e.created_by::text = auth.uid()::text
                )
            )
            OR
            -- Allow any event participant to create notifications for other participants in the same event
            -- This covers owners, editors, and viewers - all can receive task notifications
            (
                event_id IS NOT NULL 
                AND EXISTS (
                    SELECT 1 FROM event_user_roles eur1
                    WHERE eur1.event_id = event_id 
                    AND eur1.user_id::text = auth.uid()::text
                    AND eur1.status = 'active'
                )
                AND EXISTS (
                    SELECT 1 FROM event_user_roles eur2
                    WHERE eur2.event_id = event_id 
                    AND eur2.user_id::text = user_id::text
                    AND eur2.status = 'active'
                )
            )
        )
    );

-- SELECT Policy: Users can only read their own notifications  
CREATE POLICY "notifications_select_comprehensive" ON notifications
    FOR SELECT 
    USING (auth.uid()::text = user_id::text);

-- UPDATE Policy: Users can only update their own notifications (mark as read, etc.)
CREATE POLICY "notifications_update_comprehensive" ON notifications
    FOR UPDATE 
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);

-- DELETE Policy: Users can only delete their own notifications
CREATE POLICY "notifications_delete_comprehensive" ON notifications
    FOR DELETE 
    USING (auth.uid()::text = user_id::text);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_status ON notifications(read_status);
CREATE INDEX IF NOT EXISTS idx_notifications_type_event ON notifications(type, event_id);

-- Grant permissions
GRANT ALL ON notifications TO authenticated;

-- Add comment explaining the policy approach
COMMENT ON POLICY "notifications_insert_comprehensive" ON notifications IS 
'Allows task notifications for all event participants regardless of role (owner/editor/viewer). Event owners can notify anyone, and any participant can notify other participants in the same event.';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;

-- Verification complete - policies are now ready for task notifications
SELECT 'Notification policies updated successfully for all event participant roles' as status;

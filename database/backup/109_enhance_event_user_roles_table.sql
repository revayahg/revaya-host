-- Enhance event_user_roles table with additional fields
ALTER TABLE event_user_roles 
ADD COLUMN IF NOT EXISTS department TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS invitation_status TEXT DEFAULT 'accepted' CHECK (invitation_status IN ('pending', 'accepted', 'declined'));

-- Create activity log table for tracking changes
CREATE TABLE IF NOT EXISTS event_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'user_added', 'role_changed', 'user_removed', etc.
    details JSONB DEFAULT '{}', -- Additional context about the action
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on activity log
ALTER TABLE event_activity_log ENABLE ROW LEVEL SECURITY;

-- Create policies for activity log
CREATE POLICY "Users can view activity for events they have access to" ON event_activity_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_user_roles 
            WHERE event_user_roles.event_id = event_activity_log.event_id 
            AND event_user_roles.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_activity_log.event_id 
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert activity for events they have access to" ON event_activity_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_user_roles 
            WHERE event_user_roles.event_id = event_activity_log.event_id 
            AND event_user_roles.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_activity_log.event_id 
            AND events.user_id = auth.uid()
        )
    );
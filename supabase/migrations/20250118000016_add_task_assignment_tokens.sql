-- Add task assignment token system to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS task_assignment_token TEXT,
ADD COLUMN IF NOT EXISTS assignment_status TEXT DEFAULT 'pending' CHECK (assignment_status IN ('pending', 'accepted', 'declined', 'expired')),
ADD COLUMN IF NOT EXISTS response_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS response_message TEXT;

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_notifications_task_token ON notifications(task_assignment_token) WHERE task_assignment_token IS NOT NULL;

-- Create task assignment responses table for detailed tracking
CREATE TABLE IF NOT EXISTS task_assignment_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    task_assignment_token TEXT NOT NULL,
    user_id UUID NOT NULL,
    event_id UUID NOT NULL,
    task_id UUID,
    response_type TEXT NOT NULL CHECK (response_type IN ('accepted', 'declined', 'request_clarification')),
    response_message TEXT,
    responded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions
GRANT ALL ON task_assignment_responses TO authenticated, anon;

-- Create RPC functions for task assignment management
CREATE OR REPLACE FUNCTION accept_task_assignment(
    assignment_token TEXT,
    response_type TEXT DEFAULT 'accepted',
    response_message TEXT DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    notification_record RECORD;
    response_id UUID;
    result JSON;
BEGIN
    -- Find the notification by token
    SELECT * INTO notification_record 
    FROM notifications 
    WHERE task_assignment_token = assignment_token 
    AND assignment_status = 'pending';

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid or expired assignment token'
        );
    END IF;

    -- Update notification status
    UPDATE notifications 
    SET 
        assignment_status = response_type,
        response_at = NOW(),
        response_message = response_message
    WHERE task_assignment_token = assignment_token;

    -- Insert detailed response record
    INSERT INTO task_assignment_responses (
        notification_id,
        task_assignment_token,
        user_id,
        event_id,
        task_id,
        response_type,
        response_message
    ) VALUES (
        notification_record.id,
        assignment_token,
        notification_record.user_id::uuid,
        notification_record.event_id::uuid,
        (notification_record.metadata->>'task_id')::uuid,
        response_type,
        response_message
    ) RETURNING id INTO response_id;

    RETURN json_build_object(
        'success', true,
        'response_id', response_id,
        'notification_id', notification_record.id,
        'response_type', response_type
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_task_assignment_by_token(assignment_token TEXT)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    notification_record RECORD;
    event_record RECORD;
    assigner_record RECORD;
    result JSON;
BEGIN
    -- Get notification details
    SELECT * INTO notification_record 
    FROM notifications 
    WHERE task_assignment_token = assignment_token;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Assignment token not found'
        );
    END IF;

    -- Get event details
    SELECT title, description INTO event_record 
    FROM events 
    WHERE id = notification_record.event_id::uuid;

    -- Get assigner profile
    SELECT first_name, last_name, email INTO assigner_record 
    FROM profiles 
    WHERE id = (notification_record.metadata->>'created_by')::uuid;

    RETURN json_build_object(
        'success', true,
        'assignment', json_build_object(
            'id', notification_record.id,
            'title', notification_record.title,
            'message', notification_record.message,
            'status', notification_record.assignment_status,
            'created_at', notification_record.created_at,
            'due_date', notification_record.metadata->>'due_date',
            'priority', notification_record.metadata->>'priority',
            'task_description', notification_record.metadata->>'task_description',
            'event', json_build_object(
                'id', notification_record.event_id,
                'title', event_record.title,
                'description', event_record.description
            ),
            'assigner', json_build_object(
                'name', COALESCE(assigner_record.first_name || ' ' || assigner_record.last_name, assigner_record.email),
                'email', assigner_record.email
            )
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION accept_task_assignment TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_task_assignment_by_token TO authenticated, anon;
-- Create tasks table for proper task management
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'General',
    type TEXT DEFAULT 'custom',
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    due_date TIMESTAMP WITH TIME ZONE,
    assigned_to TEXT,
    assignee_vendor_id UUID REFERENCES vendor_profiles(id) ON DELETE SET NULL,
    visible_to_vendor BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_event_id ON tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_vendor_id ON tasks(assignee_vendor_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view tasks for events they created or are assigned to" ON tasks
    FOR SELECT USING (
        -- Event creator can see all tasks
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
        OR
        -- Vendors can see tasks assigned to them
        (
            assignee_vendor_id IN (
                SELECT id FROM vendor_profiles WHERE user_id = auth.uid()
            )
            AND visible_to_vendor = true
        )
    );

CREATE POLICY "Event creators can insert tasks" ON tasks
    FOR INSERT WITH CHECK (
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Event creators can update tasks" ON tasks
    FOR UPDATE USING (
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Event creators can delete tasks" ON tasks
    FOR DELETE USING (
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_tasks_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO authenticated;
GRANT USAGE ON SEQUENCE tasks_id_seq TO authenticated;

-- Add comments
COMMENT ON TABLE tasks IS 'Task management for events with vendor assignment support';
COMMENT ON COLUMN tasks.assignee_vendor_id IS 'References vendor_profiles.id for vendor-specific tasks';
COMMENT ON COLUMN tasks.visible_to_vendor IS 'Controls whether assigned vendor can see this task';

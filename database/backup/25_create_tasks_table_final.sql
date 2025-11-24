-- Create tasks table with proper structure
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'General',
    type TEXT DEFAULT 'custom',
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    due_date TIMESTAMP WITH TIME ZONE,
    assignee_vendor_id UUID REFERENCES vendor_profiles(id) ON DELETE SET NULL,
    visible_to_vendor BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_event_id ON tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_vendor_id ON tasks(assignee_vendor_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for tasks
CREATE POLICY "Event creators can manage all tasks" ON tasks
    FOR ALL USING (
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Vendors can view their assigned tasks" ON tasks
    FOR SELECT USING (
        assignee_vendor_id IN (
            SELECT id FROM vendor_profiles WHERE user_id = auth.uid()
        )
        AND visible_to_vendor = true
    );

-- Grant permissions
GRANT ALL ON tasks TO authenticated;
GRANT USAGE ON SEQUENCE tasks_id_seq TO authenticated;

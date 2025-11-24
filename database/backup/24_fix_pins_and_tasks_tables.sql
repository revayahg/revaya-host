-- Fix pins table foreign key relationship
DROP TABLE IF EXISTS pins CASCADE;

CREATE TABLE IF NOT EXISTS pins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    x DECIMAL(5,2) NOT NULL,
    y DECIMAL(5,2) NOT NULL,
    assignee_vendor_id UUID REFERENCES vendor_profiles(id) ON DELETE SET NULL,
    vendor_name TEXT,
    visible_to_vendor BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pins_event_id ON pins(event_id);
CREATE INDEX IF NOT EXISTS idx_pins_assignee_vendor_id ON pins(assignee_vendor_id);

-- Enable RLS
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pins
CREATE POLICY "Users can view pins for their events" ON pins
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
        OR
        (
            assignee_vendor_id IN (
                SELECT id FROM vendor_profiles WHERE user_id = auth.uid()
            )
            AND visible_to_vendor = true
        )
    );

CREATE POLICY "Event creators can manage pins" ON pins
    FOR ALL USING (
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
    );

-- Drop and recreate tasks table properly
DROP TABLE IF EXISTS tasks CASCADE;

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

-- Create indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_event_id ON tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_vendor_id ON tasks(assignee_vendor_id);

-- Enable RLS for tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tasks
CREATE POLICY "Users can view tasks for their events" ON tasks
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
        OR
        (
            assignee_vendor_id IN (
                SELECT id FROM vendor_profiles WHERE user_id = auth.uid()
            )
            AND visible_to_vendor = true
        )
    );

CREATE POLICY "Event creators can manage tasks" ON tasks
    FOR ALL USING (
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON pins TO authenticated;
GRANT ALL ON tasks TO authenticated;

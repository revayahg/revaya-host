-- Create missing tables that are causing errors

-- 1. Create tasks table (if it doesn't exist)
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

-- 2. Create event_vendors table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS event_vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, vendor_id)
);

-- 3. Enable RLS on both tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_vendors ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for tasks
DROP POLICY IF EXISTS "Users can view tasks for their events" ON tasks;
CREATE POLICY "Users can view tasks for their events" ON tasks
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
        OR
        assignee_vendor_id IN (
            SELECT id FROM vendor_profiles WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Event creators can manage tasks" ON tasks;
CREATE POLICY "Event creators can manage tasks" ON tasks
    FOR ALL USING (
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
    );

-- 5. Create RLS policies for event_vendors
DROP POLICY IF EXISTS "Users can view event vendor assignments" ON event_vendors;
CREATE POLICY "Users can view event vendor assignments" ON event_vendors
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
        OR
        vendor_id IN (
            SELECT id FROM vendor_profiles WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Event creators can manage vendor assignments" ON event_vendors;
CREATE POLICY "Event creators can manage vendor assignments" ON event_vendors
    FOR ALL USING (
        event_id IN (
            SELECT id FROM events WHERE user_id = auth.uid()
        )
    );

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_event_id ON tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_vendor_id ON tasks(assignee_vendor_id);
CREATE INDEX IF NOT EXISTS idx_event_vendors_event_id ON event_vendors(event_id);
CREATE INDEX IF NOT EXISTS idx_event_vendors_vendor_id ON event_vendors(vendor_id);

-- 7. Grant permissions
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON event_vendors TO authenticated;

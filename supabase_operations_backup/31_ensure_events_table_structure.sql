-- Ensure events table exists with all required columns
DO $$
BEGIN
    -- Create events table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'events') THEN
        CREATE TABLE events (
            id BIGSERIAL PRIMARY KEY,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT,
            event_type TEXT,
            date DATE,
            start_date DATE,
            end_date DATE,
            location TEXT,
            vendor_categories JSONB DEFAULT '[]'::jsonb,
            attendance INTEGER DEFAULT 0,
            expected_attendance INTEGER DEFAULT 0,
            attendance_range TEXT,
            event_map TEXT,
            logo TEXT,
            event_time TEXT,
            budget DECIMAL(10,2) DEFAULT 0,
            status TEXT DEFAULT 'active',
            is_public BOOLEAN DEFAULT true
        );
        
        -- Enable RLS
        ALTER TABLE events ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can view their own events" ON events
            FOR SELECT USING (auth.uid() = user_id);
            
        CREATE POLICY "Users can insert their own events" ON events
            FOR INSERT WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY "Users can update their own events" ON events
            FOR UPDATE USING (auth.uid() = user_id);
            
        CREATE POLICY "Users can delete their own events" ON events
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'tasks') THEN
        ALTER TABLE events ADD COLUMN tasks JSONB DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN events.tasks IS 'Array of task objects for the event';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'budget_items') THEN
        ALTER TABLE events ADD COLUMN budget_items JSONB DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN events.budget_items IS 'Array of budget item objects';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'total_budget') THEN
        ALTER TABLE events ADD COLUMN total_budget DECIMAL(10,2) DEFAULT 0;
        COMMENT ON COLUMN events.total_budget IS 'Total budget amount for the event';
    END IF;
END $$;

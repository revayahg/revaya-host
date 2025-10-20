-- Create or update events table with all required columns
DO $$ 
BEGIN
    -- Create events table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.events (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        date DATE,
        start_time TIME,
        end_time TIME,
        location VARCHAR(500),
        event_type VARCHAR(100),
        guest_count INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'draft',
        total_budget DECIMAL(12,2) DEFAULT 0,
        budget_allocation JSONB DEFAULT '{}',
        budget_items JSONB DEFAULT '[]',
        total_spent DECIMAL(12,2) DEFAULT 0,
        tasks JSONB DEFAULT '[]'
    );

    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'total_budget' AND table_schema = 'public') THEN
        ALTER TABLE public.events ADD COLUMN total_budget DECIMAL(12,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'budget_allocation' AND table_schema = 'public') THEN
        ALTER TABLE public.events ADD COLUMN budget_allocation JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'budget_items' AND table_schema = 'public') THEN
        ALTER TABLE public.events ADD COLUMN budget_items JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'total_spent' AND table_schema = 'public') THEN
        ALTER TABLE public.events ADD COLUMN total_spent DECIMAL(12,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'tasks' AND table_schema = 'public') THEN
        ALTER TABLE public.events ADD COLUMN tasks JSONB DEFAULT '[]';
    END IF;

    -- Enable RLS
    ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

    -- Create policies
    DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
    CREATE POLICY "Users can view their own events" ON public.events
        FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can insert their own events" ON public.events;
    CREATE POLICY "Users can insert their own events" ON public.events
        FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
    CREATE POLICY "Users can update their own events" ON public.events
        FOR UPDATE USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;
    CREATE POLICY "Users can delete their own events" ON public.events
        FOR DELETE USING (auth.uid() = user_id);

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
    CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
    CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
    CREATE INDEX IF NOT EXISTS idx_events_budget_allocation ON public.events USING GIN(budget_allocation);
    CREATE INDEX IF NOT EXISTS idx_events_budget_items ON public.events USING GIN(budget_items);
    CREATE INDEX IF NOT EXISTS idx_events_tasks ON public.events USING GIN(tasks);

    -- Create updated_at trigger
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
    CREATE TRIGGER update_events_updated_at
        BEFORE UPDATE ON public.events
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

END $$;
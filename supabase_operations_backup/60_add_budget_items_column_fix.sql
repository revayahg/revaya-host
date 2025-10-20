-- Add budget_items column to events table if it doesn't exist
DO $$ 
BEGIN
    -- Check if events table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Events table does not exist in public schema';
    END IF;

    -- Add budget_items column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' 
                   AND column_name = 'budget_items' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.events ADD COLUMN budget_items JSONB DEFAULT '[]';
        RAISE NOTICE 'Added budget_items column to events table';
    ELSE
        RAISE NOTICE 'budget_items column already exists in events table';
    END IF;

    -- Add other budget columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' 
                   AND column_name = 'total_budget' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.events ADD COLUMN total_budget DECIMAL(12,2) DEFAULT 0;
        RAISE NOTICE 'Added total_budget column to events table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' 
                   AND column_name = 'budget_allocation' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.events ADD COLUMN budget_allocation JSONB DEFAULT '{}';
        RAISE NOTICE 'Added budget_allocation column to events table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' 
                   AND column_name = 'total_spent' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.events ADD COLUMN total_spent DECIMAL(12,2) DEFAULT 0;
        RAISE NOTICE 'Added total_spent column to events table';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_budget_items ON public.events USING GIN(budget_items);
CREATE INDEX IF NOT EXISTS idx_events_budget_allocation ON public.events USING GIN(budget_allocation);
CREATE INDEX IF NOT EXISTS idx_events_total_budget ON public.events(total_budget);
CREATE INDEX IF NOT EXISTS idx_events_total_spent ON public.events(total_spent);

-- Verify the columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
AND table_schema = 'public'
AND column_name IN ('total_budget', 'budget_allocation', 'budget_items', 'total_spent')
ORDER BY column_name;
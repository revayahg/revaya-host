-- Final budget columns addition to events table
DO $$ 
BEGIN
    -- Check if events table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
        RAISE EXCEPTION 'Events table does not exist';
    END IF;

    -- Add total_budget column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'total_budget') THEN
        ALTER TABLE public.events ADD COLUMN total_budget DECIMAL(12,2) DEFAULT 0;
        RAISE NOTICE 'Added total_budget column';
    END IF;

    -- Add budget_allocation column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'budget_allocation') THEN
        ALTER TABLE public.events ADD COLUMN budget_allocation JSONB DEFAULT '{}';
        RAISE NOTICE 'Added budget_allocation column';
    END IF;

    -- Add budget_items column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'budget_items') THEN
        ALTER TABLE public.events ADD COLUMN budget_items JSONB DEFAULT '[]';
        RAISE NOTICE 'Added budget_items column';
    END IF;

    -- Add total_spent column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'total_spent') THEN
        ALTER TABLE public.events ADD COLUMN total_spent DECIMAL(12,2) DEFAULT 0;
        RAISE NOTICE 'Added total_spent column';
    END IF;

    RAISE NOTICE 'Budget columns setup completed successfully';
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_events_total_budget ON public.events(total_budget);
CREATE INDEX IF NOT EXISTS idx_events_budget_allocation ON public.events USING GIN(budget_allocation);
CREATE INDEX IF NOT EXISTS idx_events_budget_items ON public.events USING GIN(budget_items);
CREATE INDEX IF NOT EXISTS idx_events_total_spent ON public.events(total_spent);

-- Verify columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name IN ('total_budget', 'budget_allocation', 'budget_items', 'total_spent')
ORDER BY column_name;

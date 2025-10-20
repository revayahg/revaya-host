-- Add all budget columns to events table if they don't exist
DO $$ 
BEGIN
    -- Add total_budget column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'total_budget') THEN
        ALTER TABLE public.events ADD COLUMN total_budget DECIMAL(12,2) DEFAULT 0;
    END IF;

    -- Add budget_allocation column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'budget_allocation') THEN
        ALTER TABLE public.events ADD COLUMN budget_allocation JSONB DEFAULT '{}';
    END IF;

    -- Add budget_items column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'budget_items') THEN
        ALTER TABLE public.events ADD COLUMN budget_items JSONB DEFAULT '[]';
    END IF;

    -- Add total_spent column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'total_spent') THEN
        ALTER TABLE public.events ADD COLUMN total_spent DECIMAL(12,2) DEFAULT 0;
    END IF;
END $$;

-- Create indexes for budget queries
CREATE INDEX IF NOT EXISTS idx_events_total_budget ON public.events(total_budget);
CREATE INDEX IF NOT EXISTS idx_events_budget_allocation ON public.events USING GIN(budget_allocation);
CREATE INDEX IF NOT EXISTS idx_events_budget_items ON public.events USING GIN(budget_items);
CREATE INDEX IF NOT EXISTS idx_events_total_spent ON public.events(total_spent);

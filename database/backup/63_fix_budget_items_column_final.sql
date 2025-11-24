-- Final fix for budget_items column in events table
-- This migration ensures the budget_items column exists and is properly configured

DO $$ 
BEGIN
    -- First, check if the events table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'events' 
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Events table does not exist in public schema';
    END IF;

    -- Add budget_items column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'budget_items' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.events ADD COLUMN budget_items JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added budget_items column to events table';
    ELSE
        RAISE NOTICE 'budget_items column already exists';
    END IF;

    -- Ensure all other budget columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'total_budget' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.events ADD COLUMN total_budget DECIMAL(12,2) DEFAULT 0;
        RAISE NOTICE 'Added total_budget column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'budget_allocation' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.events ADD COLUMN budget_allocation JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added budget_allocation column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'total_spent' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.events ADD COLUMN total_spent DECIMAL(12,2) DEFAULT 0;
        RAISE NOTICE 'Added total_spent column';
    END IF;

    -- Update any existing NULL values to proper defaults
    UPDATE public.events 
    SET budget_items = '[]'::jsonb 
    WHERE budget_items IS NULL;

    UPDATE public.events 
    SET budget_allocation = '{}'::jsonb 
    WHERE budget_allocation IS NULL;

    UPDATE public.events 
    SET total_budget = 0 
    WHERE total_budget IS NULL;

    UPDATE public.events 
    SET total_spent = 0 
    WHERE total_spent IS NULL;

    RAISE NOTICE 'Budget columns setup completed successfully';
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_budget_items_gin ON public.events USING GIN(budget_items);
CREATE INDEX IF NOT EXISTS idx_events_budget_allocation_gin ON public.events USING GIN(budget_allocation);
CREATE INDEX IF NOT EXISTS idx_events_total_budget_btree ON public.events(total_budget);
CREATE INDEX IF NOT EXISTS idx_events_total_spent_btree ON public.events(total_spent);

-- Verify all budget columns exist
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

-- Show sample of events table structure
SELECT COUNT(*) as total_events FROM public.events;
-- Add missing budget columns to events table
-- This migration adds all required budget-related columns that are missing from the current schema

DO $$ 
BEGIN
    -- Add budget_items column (JSONB for storing budget line items)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'budget_items' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.events ADD COLUMN budget_items JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added budget_items column to events table';
    END IF;

    -- Add total_budget column (DECIMAL for total budget amount)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'total_budget' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.events ADD COLUMN total_budget DECIMAL(12,2) DEFAULT 0;
        RAISE NOTICE 'Added total_budget column to events table';
    END IF;

    -- Add budget_allocation column (JSONB for budget allocation by category)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'budget_allocation' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.events ADD COLUMN budget_allocation JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added budget_allocation column to events table';
    END IF;

    -- Add total_spent column (DECIMAL for tracking spent amount)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'total_spent' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.events ADD COLUMN total_spent DECIMAL(12,2) DEFAULT 0;
        RAISE NOTICE 'Added total_spent column to events table';
    END IF;

    -- Update any existing events to have proper default values
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

    RAISE NOTICE 'Budget columns added successfully and default values set';
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_budget_items ON public.events USING GIN(budget_items);
CREATE INDEX IF NOT EXISTS idx_events_budget_allocation ON public.events USING GIN(budget_allocation);

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
AND table_schema = 'public'
AND column_name IN ('budget_items', 'total_budget', 'budget_allocation', 'total_spent')
ORDER BY column_name;
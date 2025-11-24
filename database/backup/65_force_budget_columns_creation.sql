-- Force creation of budget columns with explicit schema refresh
-- Run this SQL to ensure budget_items column exists

-- First, check if columns exist
DO $$
BEGIN
    -- Add budget_items column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND table_schema = 'public' 
        AND column_name = 'budget_items'
    ) THEN
        ALTER TABLE public.events ADD COLUMN budget_items JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added budget_items column';
    ELSE
        RAISE NOTICE 'budget_items column already exists';
    END IF;

    -- Add total_budget column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND table_schema = 'public' 
        AND column_name = 'total_budget'
    ) THEN
        ALTER TABLE public.events ADD COLUMN total_budget DECIMAL(12,2) DEFAULT 0;
        RAISE NOTICE 'Added total_budget column';
    ELSE
        RAISE NOTICE 'total_budget column already exists';
    END IF;

    -- Add budget_allocation column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND table_schema = 'public' 
        AND column_name = 'budget_allocation'
    ) THEN
        ALTER TABLE public.events ADD COLUMN budget_allocation JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added budget_allocation column';
    ELSE
        RAISE NOTICE 'budget_allocation column already exists';
    END IF;

    -- Add total_spent column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND table_schema = 'public' 
        AND column_name = 'total_spent'
    ) THEN
        ALTER TABLE public.events ADD COLUMN total_spent DECIMAL(12,2) DEFAULT 0;
        RAISE NOTICE 'Added total_spent column';
    ELSE
        RAISE NOTICE 'total_spent column already exists';
    END IF;
END $$;

-- Update existing records to have proper defaults
UPDATE public.events 
SET 
    budget_items = COALESCE(budget_items, '[]'::jsonb),
    budget_allocation = COALESCE(budget_allocation, '{}'::jsonb),
    total_budget = COALESCE(total_budget, 0),
    total_spent = COALESCE(total_spent, 0);

-- Force a schema refresh by updating table statistics
ANALYZE public.events;

-- Verify all columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
AND table_schema = 'public' 
AND column_name IN ('budget', 'budget_items', 'total_budget', 'budget_allocation', 'total_spent')
ORDER BY column_name;
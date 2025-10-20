-- Create a proper budget_items table for scalable budget management
-- This replaces the JSONB column approach with a normalized table structure

-- Create budget_items table
CREATE TABLE IF NOT EXISTS public.budget_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL,
    title text NOT NULL,
    allocated_amount decimal(12,2) NOT NULL DEFAULT 0,
    spent_amount decimal(12,2) NOT NULL DEFAULT 0,
    category text,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT budget_items_pkey PRIMARY KEY (id),
    CONSTRAINT budget_items_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
    CONSTRAINT budget_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
    CONSTRAINT budget_items_allocated_amount_check CHECK (allocated_amount >= 0),
    CONSTRAINT budget_items_spent_amount_check CHECK (spent_amount >= 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_budget_items_event_id ON public.budget_items(event_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_created_by ON public.budget_items(created_by);
CREATE INDEX IF NOT EXISTS idx_budget_items_category ON public.budget_items(category);

-- Add RLS policies
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view budget items for events they have access to
CREATE POLICY "Users can view budget items for their events" ON public.budget_items
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE user_id = auth.uid() 
            OR created_by = auth.uid()
        )
    );

-- Policy: Users can insert budget items for their events
CREATE POLICY "Users can insert budget items for their events" ON public.budget_items
    FOR INSERT WITH CHECK (
        event_id IN (
            SELECT id FROM public.events 
            WHERE user_id = auth.uid() 
            OR created_by = auth.uid()
        )
    );

-- Policy: Users can update budget items for their events
CREATE POLICY "Users can update budget items for their events" ON public.budget_items
    FOR UPDATE USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE user_id = auth.uid() 
            OR created_by = auth.uid()
        )
    );

-- Policy: Users can delete budget items for their events
CREATE POLICY "Users can delete budget items for their events" ON public.budget_items
    FOR DELETE USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE user_id = auth.uid() 
            OR created_by = auth.uid()
        )
    );

-- Add total_budget column to events table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND table_schema = 'public' 
        AND column_name = 'total_budget'
    ) THEN
        ALTER TABLE public.events ADD COLUMN total_budget decimal(12,2) DEFAULT 0;
    END IF;
END $$;

-- Create a function to calculate total allocated budget
CREATE OR REPLACE FUNCTION calculate_event_total_budget(event_uuid uuid)
RETURNS decimal(12,2) AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(allocated_amount) FROM public.budget_items WHERE event_id = event_uuid),
        0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to calculate total spent budget
CREATE OR REPLACE FUNCTION calculate_event_total_spent(event_uuid uuid)
RETURNS decimal(12,2) AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(spent_amount) FROM public.budget_items WHERE event_id = event_uuid),
        0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the table was created
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'budget_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;
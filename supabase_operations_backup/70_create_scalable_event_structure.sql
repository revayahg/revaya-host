-- Create scalable event structure following the pattern of budget_items and tasks tables
-- This normalizes event data for millions of users

-- First, create event_vendor_categories table for vendor categories
CREATE TABLE IF NOT EXISTS public.event_vendor_categories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL,
    category_name text NOT NULL,
    category_icon text DEFAULT '🔧',
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT event_vendor_categories_pkey PRIMARY KEY (id),
    CONSTRAINT event_vendor_categories_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
    CONSTRAINT event_vendor_categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
    CONSTRAINT event_vendor_categories_unique UNIQUE (event_id, category_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_vendor_categories_event_id ON public.event_vendor_categories(event_id);
CREATE INDEX IF NOT EXISTS idx_event_vendor_categories_category ON public.event_vendor_categories(category_name);

-- Add RLS policies for event_vendor_categories
ALTER TABLE public.event_vendor_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage vendor categories for their events" ON public.event_vendor_categories
    FOR ALL USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE user_id = auth.uid() 
            OR created_by = auth.uid()
        )
    );

-- Update events table structure - remove JSONB columns that should be normalized
DO $$
BEGIN
    -- Remove vendor_categories column if it exists (now handled by event_vendor_categories table)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND table_schema = 'public' 
        AND column_name = 'vendor_categories'
    ) THEN
        ALTER TABLE public.events DROP COLUMN vendor_categories;
    END IF;

    -- Ensure all required columns exist with proper types
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND table_schema = 'public' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE public.events ADD COLUMN name text NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND table_schema = 'public' 
        AND column_name = 'event_type'
    ) THEN
        ALTER TABLE public.events ADD COLUMN event_type text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND table_schema = 'public' 
        AND column_name = 'start_date'
    ) THEN
        ALTER TABLE public.events ADD COLUMN start_date date;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND table_schema = 'public' 
        AND column_name = 'end_date'
    ) THEN
        ALTER TABLE public.events ADD COLUMN end_date date;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND table_schema = 'public' 
        AND column_name = 'event_time'
    ) THEN
        ALTER TABLE public.events ADD COLUMN event_time text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND table_schema = 'public' 
        AND column_name = 'attendance_range'
    ) THEN
        ALTER TABLE public.events ADD COLUMN attendance_range text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND table_schema = 'public' 
        AND column_name = 'event_map'
    ) THEN
        ALTER TABLE public.events ADD COLUMN event_map text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND table_schema = 'public' 
        AND column_name = 'logo'
    ) THEN
        ALTER TABLE public.events ADD COLUMN logo text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND table_schema = 'public' 
        AND column_name = 'is_public'
    ) THEN
        ALTER TABLE public.events ADD COLUMN is_public boolean DEFAULT true;
    END IF;

END $$;

-- Create functions for efficient vendor category retrieval
CREATE OR REPLACE FUNCTION get_event_vendor_categories(event_uuid uuid)
RETURNS text[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT category_name 
        FROM public.event_vendor_categories 
        WHERE event_id = event_uuid
        ORDER BY category_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to add vendor categories
CREATE OR REPLACE FUNCTION add_event_vendor_categories(
    event_uuid uuid,
    categories text[],
    user_uuid uuid DEFAULT auth.uid()
)
RETURNS void AS $$
DECLARE
    category text;
BEGIN
    -- First, delete existing categories for this event
    DELETE FROM public.event_vendor_categories 
    WHERE event_id = event_uuid;
    
    -- Then insert new categories
    FOREACH category IN ARRAY categories
    LOOP
        INSERT INTO public.event_vendor_categories (event_id, category_name, created_by)
        VALUES (event_uuid, category, user_uuid)
        ON CONFLICT (event_id, category_name) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON public.event_vendor_categories TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verify the table structure
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('events', 'event_vendor_categories')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
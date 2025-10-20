-- Create event_dates table for scalable multiple date/time storage
-- Following the same pattern as budget_items, tasks, and vendor_categories

CREATE TABLE IF NOT EXISTS public.event_dates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL,
    event_date date NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT event_dates_pkey PRIMARY KEY (id),
    CONSTRAINT event_dates_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
    CONSTRAINT event_dates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_dates_event_id ON public.event_dates(event_id);
CREATE INDEX IF NOT EXISTS idx_event_dates_date ON public.event_dates(event_date);

-- Add RLS policies
ALTER TABLE public.event_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage dates for their events" ON public.event_dates
    FOR ALL USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE user_id = auth.uid() 
            OR created_by = auth.uid()
        )
    );

-- Create function to get event dates
CREATE OR REPLACE FUNCTION get_event_dates(event_uuid uuid)
RETURNS TABLE(
    id uuid,
    event_date date,
    start_time text,
    end_time text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ed.id,
        ed.event_date,
        ed.start_time,
        ed.end_time
    FROM public.event_dates ed
    WHERE ed.event_id = event_uuid
    ORDER BY ed.event_date, ed.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to add event dates
CREATE OR REPLACE FUNCTION add_event_dates(
    event_uuid uuid,
    dates_data jsonb,
    user_uuid uuid DEFAULT auth.uid()
)
RETURNS void AS $$
DECLARE
    date_item jsonb;
BEGIN
    -- First, delete existing dates for this event
    DELETE FROM public.event_dates 
    WHERE event_id = event_uuid;
    
    -- Then insert new dates
    FOR date_item IN SELECT * FROM jsonb_array_elements(dates_data)
    LOOP
        INSERT INTO public.event_dates (event_id, event_date, start_time, end_time, created_by)
        VALUES (
            event_uuid,
            (date_item->>'date')::date,
            date_item->>'startTime',
            date_item->>'endTime',
            user_uuid
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON public.event_dates TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
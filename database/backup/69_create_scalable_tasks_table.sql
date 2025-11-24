-- Create a scalable tasks table following the same pattern as budget_items
-- This replaces the JSONB column approach with a normalized table structure

-- Drop existing tasks table if it exists to recreate with proper structure
DROP TABLE IF EXISTS public.tasks CASCADE;

-- Create tasks table with proper scalable structure
CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL,
    title text NOT NULL,
    description text DEFAULT '',
    category text DEFAULT 'General',
    type text DEFAULT 'custom',
    status text DEFAULT 'not_started',
    priority text DEFAULT 'medium',
    due_date timestamp with time zone,
    assignee_vendor_id uuid,
    visible_to_vendor boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    completed_at timestamp with time zone,
    estimated_hours decimal(8,2),
    actual_hours decimal(8,2),
    notes text,
    CONSTRAINT tasks_pkey PRIMARY KEY (id),
    CONSTRAINT tasks_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
    CONSTRAINT tasks_assignee_vendor_id_fkey FOREIGN KEY (assignee_vendor_id) REFERENCES public.vendor_profiles(id) ON DELETE SET NULL,
    CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
    CONSTRAINT tasks_status_check CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT tasks_type_check CHECK (type IN ('custom', 'vendor_requirement', 'deadline', 'milestone', 'reminder'))
);

-- Create indexes for performance with millions of records
CREATE INDEX IF NOT EXISTS idx_tasks_event_id ON public.tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_vendor_id ON public.tasks(assignee_vendor_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_event_status ON public.tasks(event_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_vendor_status ON public.tasks(assignee_vendor_id, status);

-- Add RLS policies
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Event creators can manage all tasks for their events
CREATE POLICY "Event creators can manage all tasks" ON public.tasks
    FOR ALL USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE user_id = auth.uid() 
            OR created_by = auth.uid()
        )
    );

-- Policy: Vendors can view and update their assigned tasks
CREATE POLICY "Vendors can view their assigned tasks" ON public.tasks
    FOR SELECT USING (
        assignee_vendor_id IN (
            SELECT id FROM public.vendor_profiles 
            WHERE user_id = auth.uid()
        )
        AND visible_to_vendor = true
    );

-- Policy: Vendors can update status of their assigned tasks
CREATE POLICY "Vendors can update their assigned tasks" ON public.tasks
    FOR UPDATE USING (
        assignee_vendor_id IN (
            SELECT id FROM public.vendor_profiles 
            WHERE user_id = auth.uid()
        )
        AND visible_to_vendor = true
    ) WITH CHECK (
        assignee_vendor_id IN (
            SELECT id FROM public.vendor_profiles 
            WHERE user_id = auth.uid()
        )
        AND visible_to_vendor = true
    );

-- Create functions for task analytics
CREATE OR REPLACE FUNCTION get_event_task_summary(event_uuid uuid)
RETURNS TABLE(
    total_tasks bigint,
    pending_tasks bigint,
    in_progress_tasks bigint,
    completed_tasks bigint,
    overdue_tasks bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::bigint as total_tasks,
        COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress')::bigint as in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'completed')::bigint as completed_tasks,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled'))::bigint as overdue_tasks
    FROM public.tasks 
    WHERE event_id = event_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for vendor task summary
CREATE OR REPLACE FUNCTION get_vendor_task_summary(vendor_uuid uuid)
RETURNS TABLE(
    total_tasks bigint,
    pending_tasks bigint,
    in_progress_tasks bigint,
    completed_tasks bigint,
    overdue_tasks bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::bigint as total_tasks,
        COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress')::bigint as in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'completed')::bigint as completed_tasks,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled'))::bigint as overdue_tasks
    FROM public.tasks 
    WHERE assignee_vendor_id = vendor_uuid 
    AND visible_to_vendor = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove tasks column from events table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND table_schema = 'public' 
        AND column_name = 'tasks'
    ) THEN
        ALTER TABLE public.events DROP COLUMN tasks;
    END IF;
END $$;

-- Verify the table was created
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND table_schema = 'public'
ORDER BY ordinal_position;
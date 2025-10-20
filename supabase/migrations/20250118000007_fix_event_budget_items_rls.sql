-- Fix RLS policies for event_budget_items table
-- This ensures users can access budget items for events they have access to

-- Enable RLS on event_budget_items table
ALTER TABLE public.event_budget_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view budget items for their events" ON public.event_budget_items;
DROP POLICY IF EXISTS "Users can insert budget items for their events" ON public.event_budget_items;
DROP POLICY IF EXISTS "Users can update budget items for their events" ON public.event_budget_items;
DROP POLICY IF EXISTS "Users can delete budget items for their events" ON public.event_budget_items;
DROP POLICY IF EXISTS "Admins and editors can insert budget items" ON public.event_budget_items;
DROP POLICY IF EXISTS "Admins and editors can update budget items" ON public.event_budget_items;
DROP POLICY IF EXISTS "Admins and editors can delete budget items" ON public.event_budget_items;

-- Policy: Users can view budget items for events they have access to (all roles)
CREATE POLICY "Users can view budget items for their events" ON public.event_budget_items
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE user_id = auth.uid() 
            OR created_by = auth.uid()
            OR id IN (
                SELECT event_id FROM public.event_user_roles 
                WHERE user_id = auth.uid() 
                AND status = 'active'
            )
        )
    );

-- Policy: Only admins (owners) and editors can insert budget items
CREATE POLICY "Admins and editors can insert budget items" ON public.event_budget_items
    FOR INSERT WITH CHECK (
        event_id IN (
            SELECT id FROM public.events 
            WHERE user_id = auth.uid() 
            OR created_by = auth.uid()
            OR id IN (
                SELECT event_id FROM public.event_user_roles 
                WHERE user_id = auth.uid() 
                AND status = 'active'
                AND role IN ('admin', 'editor')
            )
        )
    );

-- Policy: Only admins (owners) and editors can update budget items
CREATE POLICY "Admins and editors can update budget items" ON public.event_budget_items
    FOR UPDATE USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE user_id = auth.uid() 
            OR created_by = auth.uid()
            OR id IN (
                SELECT event_id FROM public.event_user_roles 
                WHERE user_id = auth.uid() 
                AND status = 'active'
                AND role IN ('admin', 'editor')
            )
        )
    );

-- Policy: Only admins (owners) and editors can delete budget items
CREATE POLICY "Admins and editors can delete budget items" ON public.event_budget_items
    FOR DELETE USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE user_id = auth.uid() 
            OR created_by = auth.uid()
            OR id IN (
                SELECT event_id FROM public.event_user_roles 
                WHERE user_id = auth.uid() 
                AND status = 'active'
                AND role IN ('admin', 'editor')
            )
        )
    );

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'event_budget_items';

-- Fix RLS policies for tasks table to allow proper task creation and management

-- Drop existing policies
DROP POLICY IF EXISTS "Event creators can manage all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Vendors can view their assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Vendors can update their assigned tasks" ON public.tasks;

-- Create comprehensive RLS policies for tasks

-- Policy 1: Event creators and collaborators can manage all tasks for their events
CREATE POLICY "Event creators can manage tasks" ON public.tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE id = tasks.event_id 
            AND (user_id = auth.uid() OR created_by = auth.uid())
        )
        OR
        EXISTS (
            SELECT 1 FROM public.event_user_roles 
            WHERE event_id = tasks.event_id 
            AND user_id = auth.uid() 
            AND role IN ('collaborator', 'admin')
            AND status = 'active'
        )
    );

-- Policy 2: Vendors can view their assigned tasks
CREATE POLICY "Vendors can view assigned tasks" ON public.tasks
    FOR SELECT USING (
        assignee_vendor_id IN (
            SELECT id FROM public.vendor_profiles 
            WHERE user_id = auth.uid()
        )
        AND visible_to_vendor = true
    );

-- Policy 3: Vendors can update status and notes of their assigned tasks
CREATE POLICY "Vendors can update assigned tasks" ON public.tasks
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

-- Policy 4: Allow task creators to manage their own tasks
CREATE POLICY "Task creators can manage their tasks" ON public.tasks
    FOR ALL USING (created_by = auth.uid());

-- Verify policies are active
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'tasks' 
AND schemaname = 'public';
-- Apply the unified event access helpers across the remaining core tables to
-- eliminate bespoke row-level policies. All event-scoped data now relies on
-- `public.can_user_view_event` and `public.can_user_edit_event`.

SET statement_timeout TO 0;
SET lock_timeout TO 0;

-- Utility procedure to drop every policy for a table before rebuilding them.
DO $$
DECLARE
  rec record;
  target_tables constant text[] := ARRAY['tasks', 'event_staff', 'event_budget_items'];
BEGIN
  FOR rec IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY(target_tables)
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      rec.policyname,
      rec.tablename
    );
  END LOOP;
END
$$;

-- Ensure RLS stays enabled
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_budget_items ENABLE ROW LEVEL SECURITY;

-- Tasks
CREATE POLICY "tasks_select"
ON public.tasks
FOR SELECT
USING (public.can_user_view_event(event_id));

CREATE POLICY "tasks_insert"
ON public.tasks
FOR INSERT
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY "tasks_update"
ON public.tasks
FOR UPDATE
USING (public.can_user_edit_event(event_id))
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY "tasks_delete"
ON public.tasks
FOR DELETE
USING (public.can_user_edit_event(event_id));

-- Event staff
CREATE POLICY "event_staff_select"
ON public.event_staff
FOR SELECT
USING (public.can_user_view_event(event_id));

CREATE POLICY "event_staff_insert"
ON public.event_staff
FOR INSERT
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY "event_staff_update"
ON public.event_staff
FOR UPDATE
USING (public.can_user_edit_event(event_id))
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY "event_staff_delete"
ON public.event_staff
FOR DELETE
USING (public.can_user_edit_event(event_id));

-- Budget items
CREATE POLICY "event_budget_items_select"
ON public.event_budget_items
FOR SELECT
USING (public.can_user_view_event(event_id));

CREATE POLICY "event_budget_items_insert"
ON public.event_budget_items
FOR INSERT
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY "event_budget_items_update"
ON public.event_budget_items
FOR UPDATE
USING (public.can_user_edit_event(event_id))
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY "event_budget_items_delete"
ON public.event_budget_items
FOR DELETE
USING (public.can_user_edit_event(event_id));

RESET lock_timeout;
RESET statement_timeout;


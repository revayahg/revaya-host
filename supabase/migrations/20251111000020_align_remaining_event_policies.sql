SET statement_timeout TO 0;
SET lock_timeout TO 0;

-- Helper to drop all existing policies for a table before rebuilding them.
CREATE OR REPLACE FUNCTION public.__drop_policies_for_table(target_table text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    rec record;
BEGIN
    FOR rec IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = target_table
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rec.policyname, target_table);
    END LOOP;
END;
$$;

-- event_dates policies
ALTER TABLE public.event_dates ENABLE ROW LEVEL SECURITY;
SELECT public.__drop_policies_for_table('event_dates');

CREATE POLICY event_dates_select
ON public.event_dates
FOR SELECT
USING (public.can_user_view_event(event_id));

CREATE POLICY event_dates_insert
ON public.event_dates
FOR INSERT
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY event_dates_update
ON public.event_dates
FOR UPDATE
USING (public.can_user_edit_event(event_id))
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY event_dates_delete
ON public.event_dates
FOR DELETE
USING (public.can_user_edit_event(event_id));

-- event_vendor_categories policies
ALTER TABLE public.event_vendor_categories ENABLE ROW LEVEL SECURITY;
SELECT public.__drop_policies_for_table('event_vendor_categories');

CREATE POLICY event_vendor_categories_select
ON public.event_vendor_categories
FOR SELECT
USING (public.can_user_view_event(event_id));

CREATE POLICY event_vendor_categories_insert
ON public.event_vendor_categories
FOR INSERT
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY event_vendor_categories_update
ON public.event_vendor_categories
FOR UPDATE
USING (public.can_user_edit_event(event_id))
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY event_vendor_categories_delete
ON public.event_vendor_categories
FOR DELETE
USING (public.can_user_edit_event(event_id));

-- event_vendors policies
ALTER TABLE public.event_vendors ENABLE ROW LEVEL SECURITY;
SELECT public.__drop_policies_for_table('event_vendors');

CREATE POLICY event_vendors_select
ON public.event_vendors
FOR SELECT
USING (public.can_user_view_event(event_id));

CREATE POLICY event_vendors_insert
ON public.event_vendors
FOR INSERT
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY event_vendors_update
ON public.event_vendors
FOR UPDATE
USING (public.can_user_edit_event(event_id))
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY event_vendors_delete
ON public.event_vendors
FOR DELETE
USING (public.can_user_edit_event(event_id));

-- event_invitations policies
ALTER TABLE public.event_invitations ENABLE ROW LEVEL SECURITY;
SELECT public.__drop_policies_for_table('event_invitations');

CREATE POLICY event_invitations_select
ON public.event_invitations
FOR SELECT
USING (public.can_user_view_event(event_id));

CREATE POLICY event_invitations_insert
ON public.event_invitations
FOR INSERT
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY event_invitations_update
ON public.event_invitations
FOR UPDATE
USING (public.can_user_edit_event(event_id))
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY event_invitations_delete
ON public.event_invitations
FOR DELETE
USING (public.can_user_edit_event(event_id));

-- event_activity_log policies
ALTER TABLE public.event_activity_log ENABLE ROW LEVEL SECURITY;
SELECT public.__drop_policies_for_table('event_activity_log');

CREATE POLICY event_activity_log_select
ON public.event_activity_log
FOR SELECT
USING (public.can_user_view_event(event_id));

CREATE POLICY event_activity_log_insert
ON public.event_activity_log
FOR INSERT
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY event_activity_log_update
ON public.event_activity_log
FOR UPDATE
USING (public.can_user_edit_event(event_id))
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY event_activity_log_delete
ON public.event_activity_log
FOR DELETE
USING (public.can_user_edit_event(event_id));

-- knowledge_documents policies
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
SELECT public.__drop_policies_for_table('knowledge_documents');

CREATE POLICY knowledge_documents_select
ON public.knowledge_documents
FOR SELECT
USING (public.can_user_view_event(event_id));

CREATE POLICY knowledge_documents_insert
ON public.knowledge_documents
FOR INSERT
WITH CHECK (
    public.can_user_edit_event(event_id)
    AND uploaded_by = auth.uid()
);

CREATE POLICY knowledge_documents_update
ON public.knowledge_documents
FOR UPDATE
USING (public.can_user_edit_event(event_id))
WITH CHECK (
    public.can_user_edit_event(event_id)
    AND uploaded_by = auth.uid()
);

CREATE POLICY knowledge_documents_delete
ON public.knowledge_documents
FOR DELETE
USING (public.can_user_edit_event(event_id));

-- Clean up helper
DROP FUNCTION public.__drop_policies_for_table(text);

RESET lock_timeout;
RESET statement_timeout;



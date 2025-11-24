SET statement_timeout TO 0;
SET lock_timeout TO 0;

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

-- message_threads policies
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
SELECT public.__drop_policies_for_table('message_threads');

CREATE POLICY message_threads_select
ON public.message_threads
FOR SELECT
USING (public.can_user_view_event(event_id));

CREATE POLICY message_threads_insert
ON public.message_threads
FOR INSERT
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY message_threads_update
ON public.message_threads
FOR UPDATE
USING (public.can_user_edit_event(event_id))
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY message_threads_delete
ON public.message_threads
FOR DELETE
USING (public.can_user_edit_event(event_id));

-- message_participants policies
ALTER TABLE public.message_participants ENABLE ROW LEVEL SECURITY;
SELECT public.__drop_policies_for_table('message_participants');

CREATE POLICY message_participants_select
ON public.message_participants
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.message_threads mt
        WHERE mt.id = thread_id
          AND public.can_user_view_event(mt.event_id)
    )
);

CREATE POLICY message_participants_insert
ON public.message_participants
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.message_threads mt
        WHERE mt.id = thread_id
          AND public.can_user_edit_event(mt.event_id)
    )
);

CREATE POLICY message_participants_update_manage
ON public.message_participants
FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM public.message_threads mt
        WHERE mt.id = thread_id
          AND public.can_user_edit_event(mt.event_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.message_threads mt
        WHERE mt.id = thread_id
          AND public.can_user_edit_event(mt.event_id)
    )
);

CREATE POLICY message_participants_update_self
ON public.message_participants
FOR UPDATE
USING (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1
        FROM public.message_threads mt
        WHERE mt.id = thread_id
          AND public.can_user_view_event(mt.event_id)
    )
)
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1
        FROM public.message_threads mt
        WHERE mt.id = thread_id
          AND public.can_user_view_event(mt.event_id)
    )
);

CREATE POLICY message_participants_delete
ON public.message_participants
FOR DELETE
USING (
    EXISTS (
        SELECT 1
        FROM public.message_threads mt
        WHERE mt.id = thread_id
          AND public.can_user_edit_event(mt.event_id)
    )
);

-- messages policies
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
SELECT public.__drop_policies_for_table('messages');

CREATE POLICY messages_select
ON public.messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.message_threads mt
        WHERE mt.id = thread_id
          AND public.can_user_view_event(mt.event_id)
    )
);

CREATE POLICY messages_insert
ON public.messages
FOR INSERT
WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.message_threads mt
        WHERE mt.id = thread_id
          AND public.can_user_view_event(mt.event_id)
    )
    AND EXISTS (
        SELECT 1
        FROM public.message_participants mp
        WHERE mp.thread_id = thread_id
          AND mp.user_id = auth.uid()
    )
);

CREATE POLICY messages_update
ON public.messages
FOR UPDATE
USING (
    sender_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.message_threads mt
        WHERE mt.id = thread_id
          AND public.can_user_edit_event(mt.event_id)
    )
)
WITH CHECK (
    sender_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.message_threads mt
        WHERE mt.id = thread_id
          AND public.can_user_edit_event(mt.event_id)
    )
);

CREATE POLICY messages_delete
ON public.messages
FOR DELETE
USING (
    sender_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.message_threads mt
        WHERE mt.id = thread_id
          AND public.can_user_edit_event(mt.event_id)
    )
);

DROP FUNCTION public.__drop_policies_for_table(text);

RESET lock_timeout;
RESET statement_timeout;



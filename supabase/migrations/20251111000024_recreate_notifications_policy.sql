SET statement_timeout TO 0;
SET lock_timeout TO 0;

DROP POLICY IF EXISTS notifications_insert_event_editor_or_self ON public.notifications;

CREATE POLICY notifications_insert_event_editor_or_self
ON public.notifications
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    OR (
        event_id IS NOT NULL
        AND public.can_user_edit_event(event_id)
    )
    OR (
        (COALESCE(metadata, '{}'::jsonb) ->> 'invitation_id') IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.event_collaborator_invitations ci
            WHERE ci.id::text = (COALESCE(metadata, '{}'::jsonb) ->> 'invitation_id')
              AND ci.invited_by = auth.uid()
        )
    )
    OR ((COALESCE(metadata, '{}'::jsonb) ->> 'inviter_id') = (auth.uid())::text)
    OR ((COALESCE(metadata, '{}'::jsonb) ->> 'created_by') = (auth.uid())::text)
);

RESET lock_timeout;
RESET statement_timeout;



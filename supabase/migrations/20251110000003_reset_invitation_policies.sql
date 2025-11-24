-- Reset the collaborator invitation policies so they rely exclusively on the
-- shared event access helpers. This removes the patchwork of legacy policies
-- and ensures consistent behaviour for viewing and managing invitations.

SET statement_timeout TO 0;
SET lock_timeout TO 0;

ALTER TABLE event_collaborator_invitations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_collaborator_invitations'
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON public.event_collaborator_invitations',
      policy_record.policyname
    );
  END LOOP;
END
$$;

CREATE POLICY "event_invites_select"
ON event_collaborator_invitations
FOR SELECT
USING (
  public.can_user_view_event(event_id)
  OR (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM auth.users au
      WHERE au.id = auth.uid()
        AND lower(au.email) = lower(event_collaborator_invitations.email)
    )
  )
);

CREATE POLICY "event_invites_insert"
ON event_collaborator_invitations
FOR INSERT
WITH CHECK (
  public.can_user_edit_event(event_id)
);

CREATE POLICY "event_invites_update"
ON event_collaborator_invitations
FOR UPDATE
USING (
  public.can_user_edit_event(event_id)
  OR (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM auth.users au
      WHERE au.id = auth.uid()
        AND lower(au.email) = lower(event_collaborator_invitations.email)
    )
  )
)
WITH CHECK (
  public.can_user_edit_event(event_id)
  OR (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM auth.users au
      WHERE au.id = auth.uid()
        AND lower(au.email) = lower(event_collaborator_invitations.email)
    )
  )
);

CREATE POLICY "event_invites_delete"
ON event_collaborator_invitations
FOR DELETE
USING (
  public.can_user_edit_event(event_id)
);

RESET lock_timeout;
RESET statement_timeout;


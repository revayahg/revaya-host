-- Rebuild event_user_roles policies without referencing the shared helpers to
-- avoid recursive policy evaluation. These policies grant access based on
-- explicit ownership or accepted invitations.

SET statement_timeout TO 0;
SET lock_timeout TO 0;

ALTER TABLE event_user_roles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_user_roles'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.event_user_roles',
      rec.policyname
    );
  END LOOP;
END
$$;

CREATE POLICY event_user_roles_select
ON public.event_user_roles
FOR SELECT
USING (
  -- User owns the role record
  user_id = auth.uid()
  OR
  -- Event owner / creator
  EXISTS (
    SELECT 1
    FROM events e
    WHERE e.id = event_user_roles.event_id
      AND (e.user_id = auth.uid() OR e.created_by = auth.uid())
  )
  OR
  -- Accepted invitation for this event matches current user's email
  EXISTS (
    SELECT 1
    FROM event_collaborator_invitations ci
    JOIN auth.users au ON au.id = auth.uid()
    WHERE ci.event_id = event_user_roles.event_id
      AND lower(ci.email) = lower(au.email)
      AND ci.status = 'accepted'
      AND ci.permission_level IN ('viewer', 'editor', 'owner')
  )
);

CREATE POLICY event_user_roles_insert
ON public.event_user_roles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM events e
    WHERE e.id = event_user_roles.event_id
      AND (e.user_id = auth.uid() OR e.created_by = auth.uid())
  )
);

CREATE POLICY event_user_roles_update
ON public.event_user_roles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM events e
    WHERE e.id = event_user_roles.event_id
      AND (e.user_id = auth.uid() OR e.created_by = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM events e
    WHERE e.id = event_user_roles.event_id
      AND (e.user_id = auth.uid() OR e.created_by = auth.uid())
  )
);

CREATE POLICY event_user_roles_delete
ON public.event_user_roles
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM events e
    WHERE e.id = event_user_roles.event_id
      AND (e.user_id = auth.uid() OR e.created_by = auth.uid())
  )
);

RESET lock_timeout;
RESET statement_timeout;


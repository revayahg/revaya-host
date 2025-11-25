-- Fix infinite recursion in event_user_roles INSERT policy
-- The policy was querying event_user_roles while evaluating an insert,
-- causing infinite recursion. Remove the recursive check.
-- Date: 2025-11-24

SET statement_timeout TO 0;
SET lock_timeout TO 0;

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS event_user_roles_insert ON public.event_user_roles;

-- Recreate the INSERT policy WITHOUT recursive check on event_user_roles
CREATE POLICY event_user_roles_insert
ON public.event_user_roles
FOR INSERT
WITH CHECK (
  -- Event owners/creators can insert any role
  EXISTS (
    SELECT 1
    FROM events e
    WHERE e.id = event_user_roles.event_id
      AND (e.user_id = auth.uid() OR e.created_by = auth.uid())
  )
  OR
  -- Users can insert their own role when they have a pending or accepted invitation
  -- (pending allows them to create the role during acceptance, before status is updated)
  -- NOTE: We only check invitations table to avoid recursion
  (
    event_user_roles.user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM event_collaborator_invitations ci
      JOIN auth.users au ON au.id = auth.uid()
      WHERE ci.event_id = event_user_roles.event_id
        AND lower(ci.email) = lower(au.email)
        AND ci.status IN ('pending', 'accepted')
        AND (
          -- Role matches invitation permission level
          (ci.permission_level = 'viewer' AND event_user_roles.role = 'viewer')
          OR (ci.permission_level = 'editor' AND event_user_roles.role = 'editor')
          OR (ci.permission_level = 'admin' AND event_user_roles.role IN ('owner', 'admin'))
          OR (ci.permission_level = 'owner' AND event_user_roles.role = 'owner')
        )
    )
  )
);

RESET lock_timeout;
RESET statement_timeout;


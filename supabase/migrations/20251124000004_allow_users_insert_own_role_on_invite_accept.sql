-- Allow users to insert their own role when accepting an invitation
-- This fixes the issue where invitation acceptance fails because users
-- can't insert into event_user_roles for themselves
-- Date: 2025-11-24

SET statement_timeout TO 0;
SET lock_timeout TO 0;

-- Update the INSERT policy to allow users to create their own role when accepting invitations
DROP POLICY IF EXISTS event_user_roles_insert ON public.event_user_roles;

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
  -- Users can insert their own role when they have an accepted invitation
  (
    event_user_roles.user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM event_collaborator_invitations ci
      JOIN auth.users au ON au.id = auth.uid()
      WHERE ci.event_id = event_user_roles.event_id
        AND lower(ci.email) = lower(au.email)
        AND ci.status = 'accepted'
        AND (
          -- Role matches invitation permission level
          (ci.permission_level = 'viewer' AND event_user_roles.role = 'viewer')
          OR (ci.permission_level = 'editor' AND event_user_roles.role = 'editor')
          OR (ci.permission_level = 'admin' AND event_user_roles.role = 'owner')
          OR (ci.permission_level = 'owner' AND event_user_roles.role = 'owner')
        )
    )
  )
  OR
  -- Users with existing admin/owner role can insert roles
  EXISTS (
    SELECT 1
    FROM event_user_roles eur
    WHERE eur.event_id = event_user_roles.event_id
      AND eur.user_id = auth.uid()
      AND eur.role IN ('owner', 'admin')
      AND eur.status = 'active'
  )
);

RESET lock_timeout;
RESET statement_timeout;


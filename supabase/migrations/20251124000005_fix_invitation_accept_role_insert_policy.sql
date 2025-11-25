-- Fix event_user_roles INSERT policy to allow pending invitations
-- The previous policy only allowed 'accepted' status, but users need to
-- insert their role BEFORE the invitation status is updated to 'accepted'
-- Date: 2025-11-24

SET statement_timeout TO 0;
SET lock_timeout TO 0;

-- Drop and recreate the INSERT policy to allow pending invitations
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
  -- Users can insert their own role when they have a pending or accepted invitation
  -- (pending allows them to create the role during acceptance, before status is updated)
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


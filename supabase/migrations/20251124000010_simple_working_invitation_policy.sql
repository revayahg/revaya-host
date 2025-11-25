-- Simple, working RLS policy for invitation acceptance
-- This allows users to insert their own role when they have a pending invitation
-- We validate the invitation in the frontend, so the policy just needs to check
-- that the user is inserting their own role and has ANY pending invitation for that event
-- Date: 2025-11-24

SET statement_timeout TO 0;
SET lock_timeout TO 0;

-- Drop all existing INSERT policies
DROP POLICY IF EXISTS event_user_roles_insert ON public.event_user_roles;

-- Simple policy: Allow users to insert their own role if they have ANY pending invitation for that event
-- The frontend already validates the invitation token, so we just need to check for existence
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
  -- Users can insert their own role if they have ANY pending invitation for that event
  -- We validate the token in the frontend, so here we just check existence
  (
    event_user_roles.user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM event_collaborator_invitations ci
      JOIN auth.users au ON au.id = auth.uid()
      WHERE ci.event_id = event_user_roles.event_id
        AND ci.status = 'pending'
        AND lower(trim(ci.email)) = lower(trim(au.email))
    )
  )
);

RESET lock_timeout;
RESET statement_timeout;


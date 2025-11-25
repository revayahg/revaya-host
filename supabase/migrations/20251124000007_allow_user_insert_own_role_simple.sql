-- Simple policy to allow users to insert their own role when they have an invitation
-- This uses a simpler check to avoid any issues with email matching or joins
-- Date: 2025-11-24

SET statement_timeout TO 0;
SET lock_timeout TO 0;

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS event_user_roles_insert ON public.event_user_roles;

-- Create a simpler policy that checks if:
-- 1. User is event owner/creator, OR
-- 2. User is inserting their own role AND has an invitation for that event
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
  -- Users can insert their own role if they have ANY invitation for this event (pending or accepted)
  -- This is safe because the token was validated earlier in the flow
  (
    event_user_roles.user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM event_collaborator_invitations ci
      JOIN auth.users au ON au.id = auth.uid()
      WHERE ci.event_id = event_user_roles.event_id
        AND lower(trim(ci.email)) = lower(trim(au.email))
        AND ci.status IN ('pending', 'accepted')
    )
  )
);

RESET lock_timeout;
RESET statement_timeout;


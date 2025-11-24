-- Refine the unified event access helper functions to align with the
-- standardized role model (`owner`, `editor`, `viewer`) and ensure that all
-- tables using these helpers inherit consistent behaviour.
--
-- This migration keeps the "single source of truth" approach: grant view/edit
-- access based on the helper, and let table policies simply call into it.

SET statement_timeout TO 0;
SET lock_timeout TO 0;

CREATE OR REPLACE FUNCTION public.can_user_view_event(target_event uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  current_user uuid := auth.uid();
  current_email text;
BEGIN
  IF current_user IS NULL THEN
    RETURN false;
  END IF;

  SELECT email
    INTO current_email
  FROM auth.users
  WHERE id = current_user;

  RETURN (
    -- Event owner / creator
    EXISTS (
      SELECT 1
      FROM events e
      WHERE e.id = target_event
        AND (
          e.user_id = current_user
          OR e.created_by = current_user
        )
    )

    -- Role assignments (if the table exists)
    OR (
      to_regclass('public.event_user_roles') IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM event_user_roles eur
        WHERE eur.event_id = target_event
          AND eur.user_id = current_user
          AND COALESCE(eur.status, 'active') = 'active'
          AND COALESCE(eur.role, 'viewer') IN ('viewer', 'editor', 'owner')
      )
    )

    -- Accepted invitations matched by email address
    OR (
      current_email IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM event_collaborator_invitations ci
        WHERE ci.event_id = target_event
          AND lower(ci.email) = lower(current_email)
          AND ci.status = 'accepted'
          AND COALESCE(ci.permission_level, 'viewer') IN ('viewer', 'editor', 'owner')
      )
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_user_edit_event(target_event uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  current_user uuid := auth.uid();
  current_email text;
BEGIN
  IF current_user IS NULL THEN
    RETURN false;
  END IF;

  SELECT email
    INTO current_email
  FROM auth.users
  WHERE id = current_user;

  RETURN (
    -- Event owner / creator
    EXISTS (
      SELECT 1
      FROM events e
      WHERE e.id = target_event
        AND (
          e.user_id = current_user
          OR e.created_by = current_user
        )
    )

    -- Role assignments (if the table exists)
    OR (
      to_regclass('public.event_user_roles') IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM event_user_roles eur
        WHERE eur.event_id = target_event
          AND eur.user_id = current_user
          AND COALESCE(eur.status, 'active') = 'active'
          AND COALESCE(eur.role, 'viewer') IN ('editor', 'owner')
      )
    )

    -- Accepted invitations matched by email address
    OR (
      current_email IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM event_collaborator_invitations ci
        WHERE ci.event_id = target_event
          AND lower(ci.email) = lower(current_email)
          AND ci.status = 'accepted'
          AND COALESCE(ci.permission_level, 'viewer') IN ('editor', 'owner')
      )
    )
  );
END;
$function$;

RESET lock_timeout;
RESET statement_timeout;


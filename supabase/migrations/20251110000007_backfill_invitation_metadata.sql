-- Backfill event_collaborator_invitations to make sure permission levels and
-- read_status align with the unified RLS helpers.

SET statement_timeout TO 0;
SET lock_timeout TO 0;

ALTER TABLE event_collaborator_invitations
  ADD COLUMN IF NOT EXISTS permission_level TEXT CHECK (permission_level IN ('viewer', 'editor', 'owner')),
  ADD COLUMN IF NOT EXISTS read_status BOOLEAN DEFAULT FALSE;

DO $$
DECLARE
  has_role_column boolean := EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'event_collaborator_invitations'
      AND column_name = 'role'
  );
  has_invited_role_column boolean := EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'event_collaborator_invitations'
      AND column_name = 'invited_role'
  );
  fallback_expr text := 'permission_level';
BEGIN
  IF has_role_column AND has_invited_role_column THEN
    fallback_expr := 'COALESCE(role, invited_role)';
  ELSIF has_role_column THEN
    fallback_expr := 'role';
  ELSIF has_invited_role_column THEN
    fallback_expr := 'invited_role';
  END IF;

  EXECUTE format('
    UPDATE event_collaborator_invitations
    SET permission_level = COALESCE(permission_level, %s, ''viewer''),
        read_status = COALESCE(read_status, FALSE)
    WHERE permission_level IS DISTINCT FROM COALESCE(%s, ''viewer'')
       OR read_status IS NULL;
  ', fallback_expr, fallback_expr);
END
$$;

-- Normalize statuses: accepted → accepted, pending otherwise
UPDATE event_collaborator_invitations
SET status = 'pending'
WHERE status IS NULL OR status NOT IN ('pending', 'accepted', 'declined', 'revoked');

RESET lock_timeout;
RESET statement_timeout;


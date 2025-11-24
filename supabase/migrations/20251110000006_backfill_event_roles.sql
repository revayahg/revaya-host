-- Backfill event_user_roles and ensure every event owner has at least an
-- "owner" role record. This aligns historical data with the unified RLS
-- helpers so that all access checks operate consistently.

SET statement_timeout TO 0;
SET lock_timeout TO 0;

CREATE TABLE IF NOT EXISTS event_user_roles (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('viewer', 'editor', 'owner')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

ALTER TABLE event_user_roles ENABLE ROW LEVEL SECURITY;

-- Ensure owners are recorded as event_user_roles
INSERT INTO event_user_roles (event_id, user_id, role, status)
SELECT e.id, e.user_id, 'owner', 'active'
FROM events e
LEFT JOIN event_user_roles eur
  ON eur.event_id = e.id
 AND eur.user_id = e.user_id
WHERE eur.id IS NULL
  AND e.user_id IS NOT NULL;

-- Ensure created_by is also treated as owner if present
INSERT INTO event_user_roles (event_id, user_id, role, status)
SELECT e.id, e.created_by, 'owner', 'active'
FROM events e
LEFT JOIN event_user_roles eur
  ON eur.event_id = e.id
 AND eur.user_id = e.created_by
WHERE eur.id IS NULL
  AND e.created_by IS NOT NULL;

-- Owners can manage the roles table (reuse helpers later)
DROP POLICY IF EXISTS "event_roles_select" ON event_user_roles;
DROP POLICY IF EXISTS "event_roles_insert" ON event_user_roles;
DROP POLICY IF EXISTS "event_roles_update" ON event_user_roles;
DROP POLICY IF EXISTS "event_roles_delete" ON event_user_roles;

CREATE POLICY "event_roles_select"
ON event_user_roles
FOR SELECT
USING (public.can_user_view_event(event_id));

CREATE POLICY "event_roles_insert"
ON event_user_roles
FOR INSERT
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY "event_roles_update"
ON event_user_roles
FOR UPDATE
USING (public.can_user_edit_event(event_id))
WITH CHECK (public.can_user_edit_event(event_id));

CREATE POLICY "event_roles_delete"
ON event_user_roles
FOR DELETE
USING (public.can_user_edit_event(event_id));

RESET lock_timeout;
RESET statement_timeout;


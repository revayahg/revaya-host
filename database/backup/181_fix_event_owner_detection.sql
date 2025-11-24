-- ===================================================================
-- Fix Event Owner Detection
-- ===================================================================

-- Ensure all events have proper created_by values
UPDATE events 
SET created_by = user_id 
WHERE created_by IS NULL AND user_id IS NOT NULL;

-- Ensure event owners have admin roles in event_user_roles
INSERT INTO event_user_roles (event_id, user_id, role, status, created_at)
SELECT 
    e.id as event_id,
    COALESCE(e.created_by, e.user_id) as user_id,
    'admin' as role,
    'active' as status,
    e.created_at
FROM events e
WHERE COALESCE(e.created_by, e.user_id) IS NOT NULL
AND NOT EXISTS (
    SELECT 1 
    FROM event_user_roles eur 
    WHERE eur.event_id = e.id 
    AND eur.user_id = COALESCE(e.created_by, e.user_id)
    AND eur.role = 'admin'
)
ON CONFLICT (event_id, user_id) DO UPDATE SET
    role = 'admin',
    status = 'active';

-- Add helpful function to get event owner
CREATE OR REPLACE FUNCTION get_event_owner(event_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    owner_id UUID;
BEGIN
    SELECT COALESCE(created_by, user_id) 
    INTO owner_id 
    FROM events 
    WHERE id = event_uuid;
    
    RETURN owner_id;
END;
$$;
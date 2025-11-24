-- Messaging V2: identity helper for participant names/emails
-- Returns (user_id, display_name, email) for a list of user uuids
-- SECURITY DEFINER so we can read auth.users.email safely.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_user_identity_bulk(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH u AS (
    SELECT a.id AS user_id,
           -- If you have a public profiles table with full_name, join it here.
           null::text AS display_name_fallback,
           a.email
    FROM auth.users a
    WHERE a.id = ANY(p_user_ids)
  )
  SELECT u.user_id,
         COALESCE(null, u.display_name_fallback, split_part(u.email, '@', 1)) AS display_name,
         u.email
  FROM u;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_identity_bulk(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.get_user_identity_bulk(uuid[]) TO authenticated;

COMMIT;

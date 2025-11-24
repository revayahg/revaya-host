-- Create function to get user emails from auth.users
-- This is needed because profiles table may not have email column
-- but auth.users always has email information

CREATE OR REPLACE FUNCTION get_user_emails(ids uuid[])
RETURNS TABLE(id uuid, email text)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT id, email FROM auth.users WHERE id = ANY(ids);
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_emails(uuid[]) TO authenticated;
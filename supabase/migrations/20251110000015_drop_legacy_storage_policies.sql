SET statement_timeout TO 0;
SET lock_timeout TO 0;

-- Note: RLS on storage.objects is already enabled by Supabase
-- We just need to drop the legacy policies

DROP POLICY IF EXISTS "Can update documents they uploaded, own or edit 16ca5ol_0" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents - event owner or editor 16ca5ol_0" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents to events they own/edit 16ca5ol_0" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents for events they collab on 16ca5ol_0" ON storage.objects;

RESET lock_timeout;
RESET statement_timeout;


-- Dev-only: allow all operations on storage.objects
DROP POLICY IF EXISTS "Allow uploads to event-documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow reads from event-documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to event-documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from event-documents bucket" ON storage.objects;

CREATE POLICY "Dev allow all insert on storage" ON storage.objects FOR INSERT WITH CHECK (true);
CREATE POLICY "Dev allow all select on storage" ON storage.objects FOR SELECT USING (true);
CREATE POLICY "Dev allow all update on storage" ON storage.objects FOR UPDATE USING (true);
CREATE POLICY "Dev allow all delete on storage" ON storage.objects FOR DELETE USING (true);

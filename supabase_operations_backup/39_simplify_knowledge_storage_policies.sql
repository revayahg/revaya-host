-- Simplify storage policies for knowledge documents

-- Drop complex policies that might be causing issues
DROP POLICY IF EXISTS "Users can upload to their events" ON storage.objects;
DROP POLICY IF EXISTS "Users can read documents from their events" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents from their events" ON storage.objects;

-- Create simpler, more permissive policies for authenticated users
CREATE POLICY "Authenticated users can upload knowledge documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'knowledge' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can read knowledge documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'knowledge' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can delete knowledge documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'knowledge' AND
        auth.role() = 'authenticated'
    );

-- Ensure the storage bucket exists and is properly configured
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge', 'knowledge', false)
ON CONFLICT (id) DO UPDATE SET
    public = false;

-- Grant necessary permissions
GRANT ALL ON knowledge_documents TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

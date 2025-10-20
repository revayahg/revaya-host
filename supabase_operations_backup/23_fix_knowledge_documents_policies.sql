-- Fix RLS policies for knowledge_documents table

-- First, let's check what policies exist and drop them
DROP POLICY IF EXISTS "Users can view their own documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON knowledge_documents;

-- Temporarily disable RLS to test
ALTER TABLE knowledge_documents DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

-- Create new, simpler policies
CREATE POLICY "Enable read access for authenticated users to their own documents" 
ON knowledge_documents FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Enable insert access for authenticated users" 
ON knowledge_documents FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update access for authenticated users to their own documents" 
ON knowledge_documents FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Enable delete access for authenticated users to their own documents" 
ON knowledge_documents FOR DELETE 
USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON knowledge_documents TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Also fix storage policies
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their documents" ON storage.objects;

-- Create simpler storage policies
CREATE POLICY "Enable upload for authenticated users" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'knowledge' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Enable read for authenticated users" ON storage.objects
FOR SELECT USING (
    bucket_id = 'knowledge' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Enable delete for authenticated users" ON storage.objects
FOR DELETE USING (
    bucket_id = 'knowledge' AND
    auth.role() = 'authenticated'
);

-- Create knowledge_documents table for storing document metadata
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_name TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    storage_path TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_user_id ON knowledge_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_upload_date ON knowledge_documents(upload_date DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON knowledge_documents;

-- Create policies for RLS with proper auth checks
CREATE POLICY "Users can view their own documents" ON knowledge_documents
    FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON knowledge_documents
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON knowledge_documents
    FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON knowledge_documents
    FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Create storage bucket for knowledge documents (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge', 'knowledge', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their documents" ON storage.objects;

-- Create storage policies with proper auth checks
CREATE POLICY "Users can upload documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'knowledge' AND
        auth.uid() IS NOT NULL AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'knowledge' AND
        auth.uid() IS NOT NULL AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'knowledge' AND
        auth.uid() IS NOT NULL AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Fix existing file_url column if it has NOT NULL constraint
ALTER TABLE knowledge_documents ALTER COLUMN file_url DROP NOT NULL;

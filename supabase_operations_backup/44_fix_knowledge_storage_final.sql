-- Final fix for knowledge storage bucket and policies

-- Ensure the knowledge bucket exists with correct configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'knowledge', 
    'knowledge', 
    false, 
    10485760, -- 10MB
    ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png',
        'image/jpeg',
        'image/webp'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png',
        'image/jpeg',
        'image/webp'
    ];

-- Drop all existing storage policies to start fresh
DROP POLICY IF EXISTS "Allow authenticated uploads to knowledge bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from knowledge bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from knowledge bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload knowledge documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view knowledge documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete knowledge documents" ON storage.objects;

-- Create simple, permissive policies for authenticated users
CREATE POLICY "knowledge_upload_policy" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'knowledge' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "knowledge_read_policy" ON storage.objects
FOR SELECT USING (
    bucket_id = 'knowledge' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "knowledge_delete_policy" ON storage.objects
FOR DELETE USING (
    bucket_id = 'knowledge' AND
    auth.role() = 'authenticated'
);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

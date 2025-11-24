-- Ensure the knowledge bucket exists with proper configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'knowledge', 
    'knowledge', 
    false, 
    10485760, -- 10MB limit
    ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp'
    ];

-- Drop all existing storage policies
DROP POLICY IF EXISTS "Enable upload for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their documents" ON storage.objects;

-- Create simple, working storage policies
CREATE POLICY "Allow authenticated uploads to knowledge bucket" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'knowledge' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated reads from knowledge bucket" ON storage.objects
FOR SELECT USING (
    bucket_id = 'knowledge' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated deletes from knowledge bucket" ON storage.objects
FOR DELETE USING (
    bucket_id = 'knowledge' AND
    auth.role() = 'authenticated'
);

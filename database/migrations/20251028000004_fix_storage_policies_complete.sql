-- Complete fix for storage RLS policies
-- Migration: 20251028000004_fix_storage_policies_complete.sql

-- First, ensure the bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'event-documents',
    'event-documents', 
    false,
    10485760, -- 10MB
    ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/svg+xml',
        'image/webp',
        'image/bmp',
        'image/tiff',
        'image/x-icon'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/svg+xml',
        'image/webp',
        'image/bmp',
        'image/tiff',
        'image/x-icon'
    ];

-- Drop ALL existing storage policies
DROP POLICY IF EXISTS "Users can upload documents to events they own" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents for events they own" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents they uploaded for events they own" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents for events they own" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents to events they own/edit" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents for events they collab on" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents they uploaded, own or edit" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents - event owner or editor" ON storage.objects;

-- Create very simple storage policies that should work
CREATE POLICY "Allow uploads to event-documents bucket" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'event-documents');

CREATE POLICY "Allow reads from event-documents bucket" ON storage.objects
    FOR SELECT USING (bucket_id = 'event-documents');

CREATE POLICY "Allow updates to event-documents bucket" ON storage.objects
    FOR UPDATE USING (bucket_id = 'event-documents');

CREATE POLICY "Allow deletes from event-documents bucket" ON storage.objects
    FOR DELETE USING (bucket_id = 'event-documents');

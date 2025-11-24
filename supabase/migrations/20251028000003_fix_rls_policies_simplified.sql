-- Fix RLS policies with simplified approach
-- Migration: 20251028000003_fix_rls_policies_simplified.sql

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert documents for events they own or edit" ON event_documents;
DROP POLICY IF EXISTS "Users can view documents for events they collaborate on" ON event_documents;
DROP POLICY IF EXISTS "Users can update documents they uploaded for events they own or edit" ON event_documents;
DROP POLICY IF EXISTS "Users can delete documents they uploaded for events they own or edit" ON event_documents;

-- Simplified RLS policies for event_documents table

-- Policy: Users can insert documents for events they own
CREATE POLICY "Users can insert documents for events they own" ON event_documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_documents.event_id 
            AND events.user_id = auth.uid()
        )
    );

-- Policy: Users can view documents for events they own
CREATE POLICY "Users can view documents for events they own" ON event_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_documents.event_id 
            AND events.user_id = auth.uid()
        )
    );

-- Policy: Users can update documents they uploaded for events they own
CREATE POLICY "Users can update documents they uploaded for events they own" ON event_documents
    FOR UPDATE USING (
        uploaded_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_documents.event_id 
            AND events.user_id = auth.uid()
        )
    );

-- Policy: Users can delete documents they uploaded for events they own
CREATE POLICY "Users can delete documents they uploaded for events they own" ON event_documents
    FOR DELETE USING (
        uploaded_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_documents.event_id 
            AND events.user_id = auth.uid()
        )
    );

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload documents to events they own/edit" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents for events they collab on" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents they uploaded, own or edit" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents - event owner or editor" ON storage.objects;

-- Simplified storage policies for event-documents bucket

-- Policy: Users can upload documents to events they own
CREATE POLICY "Users can upload documents to events they own" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'event-documents' AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id::text = (storage.foldername(name))[1]
            AND events.user_id = auth.uid()
        )
    );

-- Policy: Users can view documents for events they own
CREATE POLICY "Users can view documents for events they own" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'event-documents' AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id::text = (storage.foldername(name))[1]
            AND events.user_id = auth.uid()
        )
    );

-- Policy: Users can update documents they uploaded for events they own
CREATE POLICY "Users can update documents they uploaded for events they own" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'event-documents' AND
        owner = auth.uid() AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id::text = (storage.foldername(name))[1]
            AND events.user_id = auth.uid()
        )
    );

-- Policy: Users can delete documents for events they own
CREATE POLICY "Users can delete documents for events they own" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'event-documents' AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id::text = (storage.foldername(name))[1]
            AND events.user_id = auth.uid()
        )
    );

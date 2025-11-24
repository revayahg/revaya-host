-- Update knowledge_documents table to be event-based

-- First, let's add the event_id column and uploaded_by column
ALTER TABLE knowledge_documents 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE knowledge_documents 
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update the user_id column to uploaded_by for existing records
UPDATE knowledge_documents 
SET uploaded_by = user_id 
WHERE uploaded_by IS NULL AND user_id IS NOT NULL;

-- Drop the old user_id column (after backing up data if needed)
-- ALTER TABLE knowledge_documents DROP COLUMN IF EXISTS user_id;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_event_id ON knowledge_documents(event_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_uploaded_by ON knowledge_documents(uploaded_by);

-- Drop old policies
DROP POLICY IF EXISTS "Enable read access for authenticated users to their own documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON knowledge_documents;
DROP POLICY IF EXISTS "Enable update access for authenticated users to their own documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Enable delete access for authenticated users to their own documents" ON knowledge_documents;

-- Create new event-based policies
CREATE POLICY "Users can view documents for events they have access to" ON knowledge_documents
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        event_id IN (
            SELECT id FROM events 
            WHERE user_id = auth.uid()
            -- Add more conditions here for shared event access
        )
    );

CREATE POLICY "Users can insert documents for events they own" ON knowledge_documents
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        auth.uid() = uploaded_by AND
        event_id IN (
            SELECT id FROM events 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update documents for events they own" ON knowledge_documents
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        event_id IN (
            SELECT id FROM events 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete documents for events they own" ON knowledge_documents
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND
        event_id IN (
            SELECT id FROM events 
            WHERE user_id = auth.uid()
        )
    );

-- Update storage policies to use event-based paths
DROP POLICY IF EXISTS "Enable upload for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON storage.objects;

-- Create event-based storage policies
CREATE POLICY "Users can upload to their events" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'knowledge' AND
        auth.uid() IS NOT NULL AND
        -- Check if the path contains an event the user owns
        EXISTS (
            SELECT 1 FROM events 
            WHERE user_id = auth.uid() 
            AND name LIKE '%events/' || id::text || '%'
        )
    );

CREATE POLICY "Users can read documents from their events" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'knowledge' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can delete documents from their events" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'knowledge' AND
        auth.uid() IS NOT NULL
    );

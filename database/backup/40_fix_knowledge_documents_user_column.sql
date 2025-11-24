-- Fix knowledge_documents table to use uploaded_by column instead of user_id

-- First, ensure the uploaded_by column exists
ALTER TABLE knowledge_documents 
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Migrate data from user_id to uploaded_by if user_id column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'knowledge_documents' AND column_name = 'user_id') THEN
        UPDATE knowledge_documents 
        SET uploaded_by = user_id 
        WHERE uploaded_by IS NULL AND user_id IS NOT NULL;
        
        -- Drop the old user_id column
        ALTER TABLE knowledge_documents DROP COLUMN user_id;
    END IF;
END $$;

-- Ensure event_id column exists and is properly referenced
ALTER TABLE knowledge_documents 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- Make uploaded_by NOT NULL for new records (existing records can be null)
-- We don't enforce NOT NULL on existing records to avoid breaking them
-- But new inserts should have uploaded_by

-- Create or update indexes
DROP INDEX IF EXISTS idx_knowledge_documents_user_id;
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_uploaded_by ON knowledge_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_event_id ON knowledge_documents(event_id);

-- Drop old policies and recreate with correct column names
DROP POLICY IF EXISTS "Users can view documents for events they have access to" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can insert documents for events they own" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can update documents for events they own" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can delete documents for events they own" ON knowledge_documents;

-- Create new policies using uploaded_by column
CREATE POLICY "Users can view documents for events they have access to" ON knowledge_documents
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        event_id IN (
            SELECT id FROM events 
            WHERE user_id = auth.uid()
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

-- Grant necessary permissions
GRANT ALL ON knowledge_documents TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

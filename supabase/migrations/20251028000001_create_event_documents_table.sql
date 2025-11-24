-- Create event_documents table for AI document analysis feature
-- Migration: 20251028000001_create_event_documents_table.sql

-- Create event_documents table
CREATE TABLE IF NOT EXISTS event_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'error')),
    ai_suggestions JSONB,
    tasks_created INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add documents_processed_count column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS documents_processed_count INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_documents_event_id ON event_documents(event_id);
CREATE INDEX IF NOT EXISTS idx_event_documents_uploaded_by ON event_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_event_documents_processing_status ON event_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_event_documents_uploaded_at ON event_documents(uploaded_at);

-- Enable RLS
ALTER TABLE event_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_documents

-- Policy: Users can insert documents for events they own or have editor permission_level
CREATE POLICY "Users can insert documents for events they own or edit" ON event_documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_documents.event_id 
            AND (
                events.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM event_collaborator_invitations 
                    WHERE event_collaborator_invitations.event_id = events.id 
                    AND event_collaborator_invitations.email = (
                        SELECT email FROM auth.users WHERE id = auth.uid()
                    )
                    AND event_collaborator_invitations.status = 'accepted'
                    AND event_collaborator_invitations.permission_level IN ('editor', 'owner')
                )
            )
        )
    );

-- Policy: Users can view documents for events they own or collaborate on
CREATE POLICY "Users can view documents for events they collaborate on" ON event_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_documents.event_id 
            AND (
                events.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM event_collaborator_invitations 
                    WHERE event_collaborator_invitations.event_id = events.id 
                    AND event_collaborator_invitations.email = (
                        SELECT email FROM auth.users WHERE id = auth.uid()
                    )
                    AND event_collaborator_invitations.status = 'accepted'
                )
            )
        )
    );

-- Policy: Users can update documents they uploaded for events they own or edit
CREATE POLICY "Users can update documents they uploaded for events they own or edit" ON event_documents
    FOR UPDATE USING (
        uploaded_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_documents.event_id 
            AND (
                events.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM event_collaborator_invitations 
                    WHERE event_collaborator_invitations.event_id = events.id 
                    AND event_collaborator_invitations.email = (
                        SELECT email FROM auth.users WHERE id = auth.uid()
                    )
                    AND event_collaborator_invitations.status = 'accepted'
                    AND event_collaborator_invitations.permission_level IN ('editor', 'owner')
                )
            )
        )
    );

-- Policy: Users can delete documents they uploaded for events they own or edit
CREATE POLICY "Users can delete documents they uploaded for events they own or edit" ON event_documents
    FOR DELETE USING (
        uploaded_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_documents.event_id 
            AND (
                events.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM event_collaborator_invitations 
                    WHERE event_collaborator_invitations.event_id = events.id 
                    AND event_collaborator_invitations.email = (
                        SELECT email FROM auth.users WHERE id = auth.uid()
                    )
                    AND event_collaborator_invitations.status = 'accepted'
                    AND event_collaborator_invitations.permission_level IN ('editor', 'owner')
                )
            )
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_event_documents_updated_at 
    BEFORE UPDATE ON event_documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add constraint to ensure documents_processed_count doesn't exceed 5
ALTER TABLE events ADD CONSTRAINT check_documents_limit 
    CHECK (documents_processed_count >= 0 AND documents_processed_count <= 5);

-- Add comment for documentation
COMMENT ON TABLE event_documents IS 'Stores uploaded documents for AI task analysis';
COMMENT ON COLUMN event_documents.processing_status IS 'Status of AI analysis: pending, processing, completed, error';
COMMENT ON COLUMN event_documents.ai_suggestions IS 'JSON array of AI-generated task suggestions';
COMMENT ON COLUMN event_documents.tasks_created IS 'Number of tasks created from this document';
COMMENT ON COLUMN events.documents_processed_count IS 'Number of documents processed for AI analysis (max 5)';

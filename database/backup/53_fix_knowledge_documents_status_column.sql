-- Fix knowledge_documents table by adding missing status column
-- Run this in your Supabase SQL editor

-- Add status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'knowledge_documents' 
                   AND column_name = 'status') THEN
        ALTER TABLE knowledge_documents ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- Update existing records to have active status
UPDATE knowledge_documents SET status = 'active' WHERE status IS NULL;

-- Add constraint to ensure valid status values
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'knowledge_documents_status_check' 
                   AND table_name = 'knowledge_documents') THEN
        ALTER TABLE knowledge_documents 
        ADD CONSTRAINT knowledge_documents_status_check 
        CHECK (status IN ('active', 'archived', 'deleted'));
    END IF;
END $$;
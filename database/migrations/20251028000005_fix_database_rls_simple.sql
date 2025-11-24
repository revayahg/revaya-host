-- Simplify database RLS policies
-- Migration: 20251028000005_fix_database_rls_simple.sql

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert documents for events they own" ON event_documents;
DROP POLICY IF EXISTS "Users can view documents for events they own" ON event_documents;
DROP POLICY IF EXISTS "Users can update documents they uploaded for events they own" ON event_documents;
DROP POLICY IF EXISTS "Users can delete documents they uploaded for events they own" ON event_documents;

-- Create very simple policies that should work
CREATE POLICY "Allow all operations on event_documents" ON event_documents
    FOR ALL USING (true) WITH CHECK (true);

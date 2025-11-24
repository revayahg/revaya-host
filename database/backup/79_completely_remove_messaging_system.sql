-- Complete removal of messaging system tables and storage
-- Run this in your Supabase SQL editor to clean up the database

-- 1. Drop all messaging-related tables
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.message_threads CASCADE;
DROP TABLE IF EXISTS public.thread_participants CASCADE;
DROP TABLE IF EXISTS public.message_requests CASCADE;

-- 2. Drop messaging storage bucket if it exists
DELETE FROM storage.buckets WHERE id = 'messaging-files';

-- 3. Remove any messaging-related policies
-- (Policies will be automatically removed when tables are dropped)

-- 4. Clean up any messaging-related functions
DROP FUNCTION IF EXISTS get_user_display_name(uuid);
DROP FUNCTION IF EXISTS create_message_thread(uuid, uuid, text, text);

-- Verification queries (run these to confirm cleanup)
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%message%';
-- SELECT id FROM storage.buckets WHERE id = 'messaging-files';
-- ===================================================================
-- PRODUCTION MIGRATION - SAFE CHANGES ONLY
-- ===================================================================
-- This script contains ONLY the safe changes needed to sync production
-- with the development database improvements
-- 
-- ⚠️  RUN THIS ON PRODUCTION DATABASE ONLY AFTER TESTING
-- ⚠️  BACKUP PRODUCTION DATABASE FIRST
-- ===================================================================

-- ===================================================================
-- 1. RLS POLICY UPDATES (SAFE - Makes system more permissive)
-- ===================================================================

-- Fix event_user_roles policies to allow both event owners and collaborators
DROP POLICY IF EXISTS "Users can create roles for their events" ON event_user_roles;

CREATE POLICY "Users can create roles for their events or themselves" ON event_user_roles
FOR INSERT
TO public
WITH CHECK (
    -- Event owners can create roles for their events
    auth.uid() IN (
        SELECT events.user_id 
        FROM events 
        WHERE events.id = event_user_roles.event_id
    )
    OR
    -- Users can create roles for themselves when accepting invitations
    auth.uid() = event_user_roles.user_id
);

-- Add policy to allow event owners to view all roles for their events
CREATE POLICY "Event owners can view all roles for their events" ON event_user_roles
FOR SELECT
TO public
USING (
    auth.uid() IN (
        SELECT events.user_id 
        FROM events 
        WHERE events.id = event_user_roles.event_id
    )
    OR
    auth.uid() = event_user_roles.user_id
);

-- ===================================================================
-- 2. MESSAGE SYSTEM RLS POLICIES (SAFE - Enables chat functionality)
-- ===================================================================

-- Add policy to allow event collaborators to create message threads
CREATE POLICY "Event collaborators can create message threads" ON message_threads
FOR INSERT
TO public
WITH CHECK (
    event_id IN (
        SELECT event_id 
        FROM event_user_roles 
        WHERE user_id = auth.uid()
    )
);

-- Add policy to allow event collaborators to view message threads
CREATE POLICY "Event collaborators can view message threads" ON message_threads
FOR SELECT
TO public
USING (
    event_id IN (
        SELECT event_id 
        FROM event_user_roles 
        WHERE user_id = auth.uid()
    )
);

-- Add policy to allow event collaborators to create message participants
CREATE POLICY "Event collaborators can create message participants" ON message_participants
FOR INSERT
TO public
WITH CHECK (
    thread_id IN (
        SELECT mt.id 
        FROM message_threads mt
        JOIN event_user_roles eur ON mt.event_id = eur.event_id
        WHERE eur.user_id = auth.uid()
    )
);

-- Add policy to allow event collaborators to view message participants
CREATE POLICY "Event collaborators can view message participants" ON message_participants
FOR SELECT
TO public
USING (
    thread_id IN (
        SELECT mt.id 
        FROM message_threads mt
        JOIN event_user_roles eur ON mt.event_id = eur.event_id
        WHERE eur.user_id = auth.uid()
    )
);

-- ===================================================================
-- 3. ADD MISSING EVENT OWNER ROLES (SAFE - Only adds data)
-- ===================================================================

-- Add missing admin roles for event owners who don't have them
INSERT INTO event_user_roles (user_id, event_id, role, status)
SELECT 
    e.user_id,
    e.id,
    'admin',
    'active'
FROM events e
WHERE NOT EXISTS (
    SELECT 1 FROM event_user_roles eur 
    WHERE eur.user_id = e.user_id 
    AND eur.event_id = e.id
);

-- ===================================================================
-- 4. PROFILE SYSTEM ENHANCEMENTS (SAFE - Only adds columns with defaults)
-- ===================================================================

-- Add missing columns to profiles table if they don't exist
DO $$ 
BEGIN
    -- Add first_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'first_name') THEN
        ALTER TABLE profiles ADD COLUMN first_name TEXT;
    END IF;
    
    -- Add last_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'last_name') THEN
        ALTER TABLE profiles ADD COLUMN last_name TEXT;
    END IF;
    
    -- Add phone column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE profiles ADD COLUMN phone TEXT;
    END IF;
    
    -- Add avatar_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- ===================================================================
-- 5. VERIFICATION QUERIES (Run these to verify the migration)
-- ===================================================================

-- Check that all events have owner roles
SELECT 
    'Events without owner roles' as check_type,
    COUNT(*) as count
FROM events e
WHERE NOT EXISTS (
    SELECT 1 FROM event_user_roles eur 
    WHERE eur.user_id = e.user_id 
    AND eur.event_id = e.id
);

-- Check RLS policies are in place
SELECT 
    'RLS Policies' as check_type,
    COUNT(*) as count
FROM pg_policies 
WHERE tablename IN ('event_user_roles', 'message_threads', 'message_participants');

-- Check profiles table structure
SELECT 
    'Profile columns' as check_type,
    COUNT(*) as count
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('first_name', 'last_name', 'phone', 'avatar_url');

-- Verification Script for event_staff Table
-- This script checks if the event_staff table exists and has the correct structure
-- Run this to verify the migration has been applied

-- Check if table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'event_staff'
    ) THEN
        RAISE NOTICE '✅ event_staff table EXISTS';
    ELSE
        RAISE NOTICE '❌ event_staff table DOES NOT EXIST - Run migration: database/migrations/20251028000007_create_event_staff_table.sql';
    END IF;
END $$;

-- Check table structure
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'event_staff'
    ) THEN
        -- Check columns
        RAISE NOTICE 'Checking table structure...';
        
        -- Required columns
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'event_staff' AND column_name = 'id'
        ) THEN
            RAISE NOTICE '✅ Column: id';
        ELSE
            RAISE NOTICE '❌ Missing column: id';
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'event_staff' AND column_name = 'event_id'
        ) THEN
            RAISE NOTICE '✅ Column: event_id';
        ELSE
            RAISE NOTICE '❌ Missing column: event_id';
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'event_staff' AND column_name = 'name'
        ) THEN
            RAISE NOTICE '✅ Column: name';
        ELSE
            RAISE NOTICE '❌ Missing column: name';
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'event_staff' AND column_name = 'role'
        ) THEN
            RAISE NOTICE '✅ Column: role';
        ELSE
            RAISE NOTICE '❌ Missing column: role';
        END IF;
        
        -- Check RLS
        IF EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = 'event_staff' 
            AND rowsecurity = true
        ) THEN
            RAISE NOTICE '✅ RLS is ENABLED';
        ELSE
            RAISE NOTICE '❌ RLS is NOT ENABLED';
        END IF;
        
        -- Check policies
        IF EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'event_staff' 
            AND policyname = 'Users can view staff for events they collaborate on'
        ) THEN
            RAISE NOTICE '✅ SELECT policy exists';
        ELSE
            RAISE NOTICE '❌ SELECT policy missing';
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'event_staff' 
            AND policyname = 'Users can insert staff for events they own or edit'
        ) THEN
            RAISE NOTICE '✅ INSERT policy exists';
        ELSE
            RAISE NOTICE '❌ INSERT policy missing';
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'event_staff' 
            AND policyname = 'Users can update staff for events they own or edit'
        ) THEN
            RAISE NOTICE '✅ UPDATE policy exists';
        ELSE
            RAISE NOTICE '❌ UPDATE policy missing';
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'event_staff' 
            AND policyname = 'Users can delete staff for events they own or edit'
        ) THEN
            RAISE NOTICE '✅ DELETE policy exists';
        ELSE
            RAISE NOTICE '❌ DELETE policy missing';
        END IF;
    END IF;
END $$;

-- Test query (will fail if table doesn't exist or RLS blocks it)
DO $$
DECLARE
    test_count INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'event_staff'
    ) THEN
        BEGIN
            SELECT COUNT(*) INTO test_count FROM event_staff LIMIT 1;
            RAISE NOTICE '✅ Can query event_staff table (count: %)', test_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Cannot query event_staff table: %', SQLERRM;
        END;
    END IF;
END $$;


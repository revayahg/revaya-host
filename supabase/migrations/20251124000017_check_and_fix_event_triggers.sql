-- Check and fix any triggers or policies on events table that reference event_name
-- Date: 2025-11-24

-- First, let's check if there are any triggers on the events table
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    RAISE NOTICE 'Checking for triggers on events table...';
    FOR trigger_record IN 
        SELECT trigger_name, event_manipulation, action_statement
        FROM information_schema.triggers
        WHERE event_object_table = 'events'
        AND event_object_schema = 'public'
    LOOP
        RAISE NOTICE 'Found trigger: % on event: %', trigger_record.trigger_name, trigger_record.event_manipulation;
        RAISE NOTICE 'Action: %', trigger_record.action_statement;
    END LOOP;
END $$;

-- Check RLS policies on events table for UPDATE
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE 'Checking RLS policies on events table...';
    FOR policy_record IN
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'events'
        AND cmd = 'UPDATE'
    LOOP
        RAISE NOTICE 'Found UPDATE policy: %', policy_record.policyname;
        RAISE NOTICE 'Qual: %', policy_record.qual;
        RAISE NOTICE 'With check: %', policy_record.with_check;
    END LOOP;
END $$;

-- Check if there are any functions that might reference event_name
DO $$
DECLARE
    func_record RECORD;
BEGIN
    RAISE NOTICE 'Checking for functions that reference event_name...';
    FOR func_record IN
        SELECT routine_name, routine_definition
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_definition LIKE '%event_name%'
    LOOP
        RAISE NOTICE 'Found function referencing event_name: %', func_record.routine_name;
    END LOOP;
END $$;


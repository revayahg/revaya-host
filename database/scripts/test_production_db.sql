-- Test production database structure
-- Check if event_user_roles table exists and has correct structure

-- 1. Check if table exists
SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'event_user_roles' 
ORDER BY ordinal_position;

-- 2. Check constraints
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'event_user_roles'::regclass;

-- 3. Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'event_user_roles';

-- 4. Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'event_user_roles';

-- 5. Test a simple query
SELECT COUNT(*) FROM event_user_roles LIMIT 1;

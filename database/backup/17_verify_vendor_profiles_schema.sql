-- Verify and ensure vendor_profiles table has all necessary columns
-- This addresses potential missing column issues

-- Check current schema of vendor_profiles table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'vendor_profiles' 
ORDER BY ordinal_position;

-- Ensure business_name column exists (if it should exist)
DO $$
BEGIN
    -- Check if business_name column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_profiles' 
        AND column_name = 'business_name'
    ) THEN
        -- Add business_name column if it doesn't exist
        ALTER TABLE vendor_profiles ADD COLUMN business_name TEXT;
        RAISE NOTICE 'Column business_name added to vendor_profiles table';
    ELSE
        RAISE NOTICE 'Column business_name already exists in vendor_profiles table';
    END IF;
END $$;

-- Ensure all commonly used columns exist
DO $$
BEGIN
    -- Check and add name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_profiles' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE vendor_profiles ADD COLUMN name TEXT;
        RAISE NOTICE 'Column name added to vendor_profiles table';
    END IF;

    -- Check and add company column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_profiles' 
        AND column_name = 'company'
    ) THEN
        ALTER TABLE vendor_profiles ADD COLUMN company TEXT;
        RAISE NOTICE 'Column company added to vendor_profiles table';
    END IF;

    -- Check and add email column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_profiles' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE vendor_profiles ADD COLUMN email TEXT;
        RAISE NOTICE 'Column email added to vendor_profiles table';
    END IF;
END $$;

-- Create index on commonly queried columns for better performance
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_name ON vendor_profiles(name);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_company ON vendor_profiles(company);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_business_name ON vendor_profiles(business_name);

-- Add comments for documentation
COMMENT ON COLUMN vendor_profiles.name IS 'Primary vendor contact name';
COMMENT ON COLUMN vendor_profiles.company IS 'Company or business name';
COMMENT ON COLUMN vendor_profiles.business_name IS 'Alternative business name field';
COMMENT ON COLUMN vendor_profiles.email IS 'Primary contact email';

-- Show final schema
SELECT 
    'vendor_profiles schema verified' as status,
    COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_name = 'vendor_profiles';

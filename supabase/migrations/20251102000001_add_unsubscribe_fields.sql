-- Add unsubscribe support to profiles and related tables
-- Version: 0.1.1-alpha.5
-- Date: 2025-11-02
-- Description: Adds unsubscribe_token and unsubscribed_at columns for email marketing compliance

-- Step 1: Add unsubscribe fields to profiles table
DO $$
BEGIN
    -- Add unsubscribe_token column (UUID for unique token generation)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'unsubscribe_token'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN unsubscribe_token UUID DEFAULT gen_random_uuid();
        RAISE NOTICE 'Added unsubscribe_token column to profiles';
    END IF;

    -- Add unsubscribed_at column (timestamp to track when user unsubscribed)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'unsubscribed_at'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN unsubscribed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added unsubscribed_at column to profiles';
    END IF;
END $$;

-- Step 2: Create index on unsubscribe_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_unsubscribe_token 
ON public.profiles(unsubscribe_token) 
WHERE unsubscribe_token IS NOT NULL;

-- Step 3: Add unsubscribe fields to contacts table (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'contacts' 
        AND table_schema = 'public'
    ) THEN
        -- Add unsubscribe_token column
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'contacts' 
            AND column_name = 'unsubscribe_token'
        ) THEN
            ALTER TABLE public.contacts 
            ADD COLUMN unsubscribe_token UUID DEFAULT gen_random_uuid();
            RAISE NOTICE 'Added unsubscribe_token column to contacts';
        END IF;

        -- Add unsubscribed_at column
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'contacts' 
            AND column_name = 'unsubscribed_at'
        ) THEN
            ALTER TABLE public.contacts 
            ADD COLUMN unsubscribed_at TIMESTAMP WITH TIME ZONE;
            RAISE NOTICE 'Added unsubscribed_at column to contacts';
        END IF;

        -- Create index
        CREATE INDEX IF NOT EXISTS idx_contacts_unsubscribe_token 
        ON public.contacts(unsubscribe_token) 
        WHERE unsubscribe_token IS NOT NULL;
    ELSE
        RAISE NOTICE 'contacts table does not exist, skipping';
    END IF;
END $$;

-- Step 4: Add unsubscribe fields to vendor_profiles table (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'vendor_profiles' 
        AND table_schema = 'public'
    ) THEN
        -- Add unsubscribe_token column
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'vendor_profiles' 
            AND column_name = 'unsubscribe_token'
        ) THEN
            ALTER TABLE public.vendor_profiles 
            ADD COLUMN unsubscribe_token UUID DEFAULT gen_random_uuid();
            RAISE NOTICE 'Added unsubscribe_token column to vendor_profiles';
        END IF;

        -- Add unsubscribed_at column
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'vendor_profiles' 
            AND column_name = 'unsubscribed_at'
        ) THEN
            ALTER TABLE public.vendor_profiles 
            ADD COLUMN unsubscribed_at TIMESTAMP WITH TIME ZONE;
            RAISE NOTICE 'Added unsubscribed_at column to vendor_profiles';
        END IF;

        -- Create index
        CREATE INDEX IF NOT EXISTS idx_vendor_profiles_unsubscribe_token 
        ON public.vendor_profiles(unsubscribe_token) 
        WHERE unsubscribe_token IS NOT NULL;
    ELSE
        RAISE NOTICE 'vendor_profiles table does not exist, skipping';
    END IF;
END $$;

-- Step 5: Generate tokens for existing profiles (if they don't have one)
UPDATE public.profiles 
SET unsubscribe_token = gen_random_uuid()
WHERE unsubscribe_token IS NULL;

-- Step 6: Add comments for documentation
COMMENT ON COLUMN public.profiles.unsubscribe_token IS 'Unique token for unsubscribe links in marketing emails';
COMMENT ON COLUMN public.profiles.unsubscribed_at IS 'Timestamp when user unsubscribed from marketing emails (NULL = subscribed)';

-- Step 7: Verification query (commented out - run manually if needed)
/*
SELECT 
    'profiles' as table_name,
    COUNT(*) as total_rows,
    COUNT(unsubscribe_token) as rows_with_token,
    COUNT(unsubscribed_at) as unsubscribed_count
FROM public.profiles

UNION ALL

SELECT 
    'contacts' as table_name,
    COUNT(*) as total_rows,
    COUNT(unsubscribe_token) as rows_with_token,
    COUNT(unsubscribed_at) as unsubscribed_count
FROM public.contacts

UNION ALL

SELECT 
    'vendor_profiles' as table_name,
    COUNT(*) as total_rows,
    COUNT(unsubscribe_token) as rows_with_token,
    COUNT(unsubscribed_at) as unsubscribed_count
FROM public.vendor_profiles;
*/


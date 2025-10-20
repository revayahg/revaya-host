-- Ensure category column exists in vendor_profiles table
DO $$ 
BEGIN
    -- Check if category column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_profiles' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE vendor_profiles ADD COLUMN category TEXT;
    END IF;
END $$;

-- Add comment to describe the column
COMMENT ON COLUMN vendor_profiles.category IS 'Vendor service category with emoji and subcategory (e.g., "🍽️ Food & Beverage - Food Trucks")';

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_category ON vendor_profiles(category);

-- Update any existing records that might have null categories
UPDATE vendor_profiles 
SET category = 'Other - General Services' 
WHERE category IS NULL OR category = '';

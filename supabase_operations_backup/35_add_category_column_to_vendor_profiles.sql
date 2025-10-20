-- Add category column to vendor_profiles table
ALTER TABLE vendor_profiles 
ADD COLUMN IF NOT EXISTS category VARCHAR(255);

-- Add some default categories as examples
COMMENT ON COLUMN vendor_profiles.category IS 'Vendor service category (e.g., Catering, Photography, Music, etc.)';

-- Update any existing records to have a default category if needed
UPDATE vendor_profiles 
SET category = 'General Services' 
WHERE category IS NULL OR category = '';

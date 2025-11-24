-- Add profile_picture_url column if it doesn't exist
ALTER TABLE vendor_profiles 
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Update existing profiles to have null profile picture initially
UPDATE vendor_profiles 
SET profile_picture_url = NULL 
WHERE profile_picture_url IS NULL;

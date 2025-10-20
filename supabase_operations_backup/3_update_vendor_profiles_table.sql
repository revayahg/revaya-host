-- Add new columns for profile editor
ALTER TABLE vendor_profiles
ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Create storage bucket for profile pictures if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('profile-pictures', 'profile-pictures')
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy for profile pictures
CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own profile pictures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Profile pictures are publicly readable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

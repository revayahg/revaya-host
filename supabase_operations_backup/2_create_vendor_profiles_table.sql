-- Create vendor_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS vendor_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    job_title VARCHAR(255),
    phone VARCHAR(50),
    bio TEXT,
    is_public BOOLEAN DEFAULT true,
    social_media JSONB DEFAULT '{}',
    services JSONB DEFAULT '[]',
    certifications JSONB DEFAULT '[]',
    portfolio_images JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index on user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_profiles_user_id ON vendor_profiles(user_id);

-- Add RLS policies
ALTER TABLE vendor_profiles ENABLE ROW LEVEL SECURITY;

-- Policy for viewing public profiles
CREATE POLICY "View public profiles" 
ON vendor_profiles
FOR SELECT 
USING (is_public = true);

-- Policy for users to view their own profile
CREATE POLICY "Users can view own profile" 
ON vendor_profiles
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for users to update their own profile
CREATE POLICY "Users can update own profile" 
ON vendor_profiles
FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy for users to insert their own profile
CREATE POLICY "Users can insert own profile" 
ON vendor_profiles
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vendor_profiles_updated_at
    BEFORE UPDATE ON vendor_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

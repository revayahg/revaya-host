-- Create profiles table for user information
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    phone TEXT,
    company TEXT,
    role TEXT DEFAULT 'planner',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow reading profiles for messaging purposes
DROP POLICY IF EXISTS "Profiles are viewable for messaging" ON public.profiles;
CREATE POLICY "Profiles are viewable for messaging" ON public.profiles
    FOR SELECT USING (
        -- Users can see profiles of people they have events/vendor relationships with
        id IN (
            SELECT DISTINCT user_id FROM events WHERE user_id = auth.uid()
            UNION
            SELECT DISTINCT user_id FROM vendor_profiles WHERE user_id = auth.uid()
            UNION
            -- Event planners can see vendor profiles for their events
            SELECT DISTINCT vp.user_id FROM vendor_profiles vp
            JOIN event_invitations ei ON ei.vendor_profile_id = vp.id
            JOIN events e ON e.id = ei.event_id
            WHERE e.user_id = auth.uid()
            UNION
            -- Vendors can see event planner profiles for events they're invited to
            SELECT DISTINCT e.user_id FROM events e
            JOIN event_invitations ei ON ei.event_id = e.id
            JOIN vendor_profiles vp ON vp.id = ei.vendor_profile_id
            WHERE vp.user_id = auth.uid()
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);

-- Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
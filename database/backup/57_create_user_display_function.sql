-- Create a function to get user display name from auth.users
CREATE OR REPLACE FUNCTION get_user_display_name(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    user_email TEXT;
    user_name TEXT;
BEGIN
    -- Get user email and metadata from auth.users
    SELECT 
        email,
        COALESCE(
            raw_user_meta_data->>'full_name',
            raw_user_meta_data->>'name',
            email
        )
    INTO user_email, user_name
    FROM auth.users 
    WHERE id = user_uuid;
    
    -- Return the best available name
    IF user_name IS NOT NULL AND user_name != user_email THEN
        RETURN user_name;
    ELSIF user_email IS NOT NULL THEN
        RETURN split_part(user_email, '@', 1);
    ELSE
        RETURN 'Unknown User';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_display_name(UUID) TO authenticated;
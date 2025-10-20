// getCurrentUser function - provides user profile data
// This function combines auth user data with profile data

async function getCurrentUser() {
    try {
        if (!window.supabaseClient) {
            return null;
        }

        // Get the current session
        const session = await window.getCurrentSession?.();
        if (!session?.user) {
            return null;
        }

        const user = session.user;
        
        // Try to get profile data from the profiles table
        const { data: profile, error: profileError } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError && profileError.code !== 'PGRST116') {
        }

        // Combine auth user data with profile data
        const userData = {
            id: user.id,
            email: user.email,
            firstName: profile?.first_name || user.user_metadata?.first_name || '',
            lastName: profile?.last_name || user.user_metadata?.last_name || '',
            phone: profile?.phone || user.user_metadata?.phone || '',
            avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || '',
            companyName: profile?.company || user.user_metadata?.company || '',
            jobTitle: profile?.job_title || user.user_metadata?.job_title || '',
            bio: profile?.bio || user.user_metadata?.bio || '',
            profilePicture: profile?.avatar_url || user.user_metadata?.avatar_url || '',
            createdAt: profile?.created_at || user.created_at,
            updatedAt: profile?.updated_at
        };

        return {
            id: userData.id,
            email: userData.email,
            hasProfile: !!profile,
            hasFirstName: !!userData.firstName
        };

    } catch (error) {
        return null;
    }
}

// Make function globally available
window.getCurrentUser = getCurrentUser;

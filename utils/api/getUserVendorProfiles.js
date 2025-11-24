async function getUserVendorProfiles(userId) {
    try {
        if (!userId) {
            throw new Error('User ID is required');
        }

        const { data, error } = await window.supabaseClient
            .from('vendor_profiles')
            .select('id, name, company, category, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50); // Reasonable limit for performance

        if (error) {
            throw new Error(`Failed to fetch vendor profiles: ${error.message}`);
        }

        return data || [];
    } catch (err) {
        throw new Error(err?.message || err?.error?.message || 'Failed to fetch vendor profiles');
    }
}

// Make function available globally
window.getUserVendorProfiles = getUserVendorProfiles;

async function saveVendorProfile(profileData) {
  try {
    // Get current user with graceful error handling
    const session = await window.getSessionWithRetry?.(3, 150);
    const user = session?.user;
    if (!user) {
        return { error: 'Authentication required' };
    }

    // Validate required data
    if (!profileData.company && !profileData.name) {
      throw new Error('Company/Vendor Name is required');
    }

    // Prepare profile data matching Supabase schema exactly
    const vendorProfile = {
      user_id: user.id,
      company: profileData.company || profileData.name || '',
      name: profileData.name || '',
      email: profileData.email || '',
      job_title: profileData.job_title || '',
      phone: profileData.phone || '',
      bio: profileData.bio || '',
      category: profileData.category || '',
      is_public: profileData.is_public !== undefined ? profileData.is_public : true,
      certifications: Array.isArray(profileData.certifications) ? profileData.certifications : [],
      portfolio_images: Array.isArray(profileData.portfolio_images) ? profileData.portfolio_images : [],
      services: Array.isArray(profileData.services) ? profileData.services : [],
      service_areas: Array.isArray(profileData.service_areas) ? profileData.service_areas : [],
      social_media: Array.isArray(profileData.social_media) ? profileData.social_media : [],
      insurance: profileData.insurance || {},
      years_of_experience: profileData.years_of_experience || null,
      profile_picture_url: profileData.profile_picture_url || null,
      updated_at: new Date().toISOString()
    };

    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await window.supabaseClient
      .from('vendor_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Only throw if it's not a "not found" error
    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // Update or insert profile
    if (existingProfile) {
      return await window.supabaseClient
        .from('vendor_profiles')
        .update(vendorProfile)
        .eq('user_id', user.id)
        .select()
        .single();
    } else {
      return await window.supabaseClient
        .from('vendor_profiles')
        .insert(vendorProfile)
        .select()
        .single();
    }
  } catch (error) {
    return { error };
  }
}

async function getVendorProfile(userId) {
  try {
    return await window.supabaseClient
      .from('vendor_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
  } catch (error) {
    return { error };
  }
}

async function getVendorProfileById(profileId) {
  try {
    return await window.supabaseClient
      .from('vendor_profiles')
      .select('*')
      .eq('id', profileId)
      .single();
  } catch (error) {
    return { error };
  }
}

window.saveVendorProfile = saveVendorProfile;
window.getVendorProfile = getVendorProfile;
window.getVendorProfileById = getVendorProfileById;

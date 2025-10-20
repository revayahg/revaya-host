// EventVendorAPI - Manages vendor assignments to events
const EventVendorAPI = {
    // Get all event vendors with their invitation status
    getEventVendors: async function(eventId) {
        try {
            
            if (!eventId) {
                return [];
            }

            const { data: invitations, error: invError } = await window.supabaseClient
                .from('event_invitations')
                .select(`
                    id,
                    vendor_profile_id,
                    response,
                    invite_timestamp,
                    vendor_name,
                    vendor_email,
                    event_id
                `)
                .eq('event_id', eventId)
                .order('invite_timestamp', { ascending: false });

            if (invError) {
                return [];
            }

            // Get vendor profile data separately
            const vendorProfileIds = invitations?.map(inv => inv.vendor_profile_id).filter(Boolean) || [];
            
            if (vendorProfileIds.length === 0) {
                return invitations?.map(inv => ({
                    ...inv,
                    vendor_profiles: null
                })) || [];
            }

            const { data: vendorProfiles, error: profileError } = await window.supabaseClient
                .from('vendor_profiles')
                .select('id, user_id, name, company, category, phone, email, description, services, portfolio_images, certifications, profile_picture_url')
                .in('id', vendorProfileIds);

            if (profileError) {
            }

            // Combine invitation and profile data
            const result = invitations?.map(invitation => ({
                ...invitation,
                vendor_profiles: vendorProfiles?.find(vp => vp.id === invitation.vendor_profile_id) || null
            })) || [];

            return result;
        } catch (error) {
            return [];
        }
    },

    // Get only accepted vendors for messaging
    getAcceptedEventVendors: async function(eventId) {
        try {
            
            if (!eventId) {
                return [];
            }

            // First check if event_invitations table exists by trying a simple query
            const { data: invitations, error: invError } = await window.supabaseClient
                .from('event_invitations')
                .select('vendor_profile_id, response, invite_timestamp, vendor_name, vendor_email')
                .eq('event_id', eventId)
                .eq('response', 'accepted');

            if (invError) {
                
                // If table doesn't exist, return empty array
                if (invError.code === 'PGRST116' || invError.message?.includes('relation') || invError.message?.includes('does not exist')) {
                    return [];
                }
                
                // For other errors, return empty array but log the error
                return [];
            }

            if (!invitations || invitations.length === 0) {
                return [];
            }

            // Get vendor profile data separately
            const vendorProfileIds = invitations.map(inv => inv.vendor_profile_id).filter(Boolean);
            
            if (vendorProfileIds.length === 0) {
                return invitations.map(inv => ({
                    vendor_profile_id: inv.vendor_profile_id,
                    response: inv.response,
                    invited_at: inv.invite_timestamp,
                    vendor_name: inv.vendor_name,
                    vendor_email: inv.vendor_email,
                    vendor_profiles: null
                }));
            }

            const { data: vendorProfiles, error: profileError } = await window.supabaseClient
                .from('vendor_profiles')
                .select('id, user_id, name, company, category, phone, email, description, services, portfolio_images, certifications, profile_picture_url')
                .in('id', vendorProfileIds);

            if (profileError) {
                // Continue without profile data
            }

            // Combine invitation and profile data
            const result = invitations.map(invitation => ({
                vendor_profile_id: invitation.vendor_profile_id,
                response: invitation.response,
                invited_at: invitation.invite_timestamp,
                vendor_name: invitation.vendor_name,
                vendor_email: invitation.vendor_email,
                vendor_profiles: vendorProfiles?.find(vp => vp.id === invitation.vendor_profile_id) || null
            }));

            return result;
        } catch (error) {
            
            // Return empty array instead of throwing to prevent breaking the UI
            return [];
        }
    }
};

// Add real-time event listeners for automatic cache invalidation
if (typeof window !== 'undefined') {
    window.EventVendorAPI = EventVendorAPI;
    
    // Listen for vendor data changes to invalidate cache
    let vendorCache = new Map();
    
    const clearVendorCache = (eventId) => {
        if (eventId) {
            vendorCache.delete(`vendors_${eventId}`);
            vendorCache.delete(`accepted_${eventId}`);
        } else {
            vendorCache.clear();
        }
    };
    
    // Listen for various vendor-related events
    window.addEventListener('vendorAccepted', (e) => clearVendorCache(e.detail?.eventId));
    window.addEventListener('vendorDeclined', (e) => clearVendorCache(e.detail?.eventId));
    window.addEventListener('vendorInvited', (e) => clearVendorCache(e.detail?.eventId));
    window.addEventListener('vendorDataChanged', (e) => clearVendorCache(e.detail?.eventId));
    window.addEventListener('invitationStatusChanged', (e) => clearVendorCache(e.detail?.eventId));
    window.addEventListener('forceVendorRefresh', (e) => clearVendorCache(e.detail?.eventId));
    
    // Enhanced API methods with caching
    const originalGetEventVendors = EventVendorAPI.getEventVendors;
    const originalGetAcceptedEventVendors = EventVendorAPI.getAcceptedEventVendors;
    
    EventVendorAPI.getEventVendors = async function(eventId, forceRefresh = false) {
        const cacheKey = `vendors_${eventId}`;
        if (!forceRefresh && vendorCache.has(cacheKey)) {
            return vendorCache.get(cacheKey);
        }
        
        const result = await originalGetEventVendors.call(this, eventId);
        vendorCache.set(cacheKey, result);
        return result;
    };
    
    EventVendorAPI.getAcceptedEventVendors = async function(eventId, forceRefresh = false) {
        const cacheKey = `accepted_${eventId}`;
        if (!forceRefresh && vendorCache.has(cacheKey)) {
            return vendorCache.get(cacheKey);
        }
        
        const result = await originalGetAcceptedEventVendors.call(this, eventId);
        vendorCache.set(cacheKey, result);
        return result;
    };
}



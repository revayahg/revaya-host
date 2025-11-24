async function getUserVendorProfiles(userId) {
    try {
        if (!userId) {
            // Try to get from current session first
            try {
                const session = await window.getCurrentSession();
                if (session?.user?.id) {
                    userId = session.user.id;
                } else {
                    userId = localStorage.getItem('currentUserId');
                }
            } catch (sessionError) {
                userId = localStorage.getItem('currentUserId');
            }
        }
        
        if (!userId) {
            return [];
        }

        // Check if trickle functions are available
        if (!window.trickleListObjects) {
            const cachedVendors = localStorage.getItem('vendorProfiles');
            return cachedVendors ? JSON.parse(cachedVendors) : [];
        }

        const { items } = await window.trickleListObjects(`vendor:${userId}`, 100, true);
        const vendors = items.map(vendor => ({
            ...vendor.objectData,
            id: vendor.objectId,
            createdAt: vendor.createdAt,
            updatedAt: vendor.updatedAt
        }));

        // Update localStorage with the latest data
        localStorage.setItem('vendorProfiles', JSON.stringify(vendors));
        
        return vendors;
    } catch (error) {
        
        // Log detailed error information
        if (error && typeof error === 'object') {
            console.error('Vendor API error:', {
                message: error.message,
                stack: error.stack,
                error: error.error
            });
        }
        
        // Fallback to localStorage if trickle fetch fails
        const cachedVendors = localStorage.getItem('vendorProfiles');
        return cachedVendors ? JSON.parse(cachedVendors) : [];
    }
}

async function getVendorProfile(vendorId) {
    try {
        if (!vendorId) {
            return null;
        }

        const userId = localStorage.getItem('currentUserId');
        if (!userId) {
            throw new Error('User ID is required');
        }

        const vendorObjectType = `vendor:${userId}`;
        let vendor;

        try {
            // Try to get from trickle first
            const trickleVendor = await trickleGetObject(vendorObjectType, vendorId);
            vendor = {
                ...trickleVendor.objectData,
                id: trickleVendor.objectId,
                createdAt: trickleVendor.createdAt,
                updatedAt: trickleVendor.updatedAt
            };

            // Update localStorage with the latest data
            const localVendors = JSON.parse(localStorage.getItem('vendorProfiles') || '[]');
            const updatedVendors = localVendors.map(v => 
                v.id === vendorId ? vendor : v
            );
            if (!localVendors.find(v => v.id === vendorId)) {
                updatedVendors.push(vendor);
            }
            localStorage.setItem('vendorProfiles', JSON.stringify(updatedVendors));
        } catch (error) {
            if (error.message.includes('ObjectNotFound')) {
                // Try to get from localStorage if not found in trickle
                const localVendors = JSON.parse(localStorage.getItem('vendorProfiles') || '[]');
                vendor = localVendors.find(v => v.id === vendorId);
                
                if (!vendor) {
                    // If not found in localStorage either, return a new vendor object
                    vendor = {
                        id: vendorId,
                        businessName: '',
                        email: '',
                        phone: '',
                        website: '',
                        category: '',
                        description: '',
                        location: '',
                        socialMedia: {
                            instagram: '',
                            facebook: '',
                            twitter: '',
                            tiktok: ''
                        },
                        certifications: [],
                        logoUrl: '',
                        coverImageUrl: '',
                        portfolioImages: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        changeLog: []
                    };
                }
            } else {
                throw error;
            }
        }

        return vendor;
    } catch (error) {
        let errorMessage = 'Unknown error occurred';
        
        if (error && typeof error === 'object') {
            if (error.message) {
                errorMessage = error.message;
            } else if (error.error && error.error.message) {
                errorMessage = error.error.message;
            } else if (typeof error.toString === 'function') {
                errorMessage = error.toString();
            }
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        
        
        // Final fallback - try localStorage one last time
        const localVendors = JSON.parse(localStorage.getItem('vendorProfiles') || '[]');
        return localVendors.find(v => v.id === vendorId) || null;
    }
}

async function createVendorProfile(vendorData) {
    try {
        let userId = localStorage.getItem('currentUserId');
        
        // Try to get from current session if not in localStorage
        if (!userId) {
            try {
                const session = await window.getCurrentSession();
                if (session?.user?.id) {
                    userId = session.user.id;
                    localStorage.setItem('currentUserId', userId);
                }
            } catch (sessionError) {
            }
        }
        
        if (!userId) {
            throw new Error('User authentication required');
        }

        // Check if trickle functions are available
        if (!window.trickleCreateObject) {
            throw new Error('Trickle functions not available');
        }

        const vendorObjectType = `vendor:${userId}`;
        
        // Create in trickle
        const vendor = await window.trickleCreateObject(vendorObjectType, vendorData);
        const newVendor = {
            ...vendor.objectData,
            id: vendor.objectId,
            createdAt: vendor.createdAt,
            updatedAt: vendor.updatedAt
        };
        
        // Update localStorage
        const localVendors = JSON.parse(localStorage.getItem('vendorProfiles') || '[]');
        localVendors.push(newVendor);
        localStorage.setItem('vendorProfiles', JSON.stringify(localVendors));
        
        return newVendor;
    } catch (error) {
        throw error;
    }
}

async function updateVendorProfile(vendorId, vendorData) {
    try {
        const userId = localStorage.getItem('currentUserId');
        if (!userId) {
            throw new Error('User ID is required');
        }

        const vendorObjectType = `vendor:${userId}`;
        
        // Update in trickle
        const vendor = await trickleUpdateObject(vendorObjectType, vendorId, vendorData);
        const updatedVendor = {
            ...vendor.objectData,
            id: vendor.objectId,
            createdAt: vendor.createdAt,
            updatedAt: vendor.updatedAt
        };
        
        // Update localStorage
        const localVendors = JSON.parse(localStorage.getItem('vendorProfiles') || '[]');
        const updatedVendors = localVendors.map(v => 
            v.id === vendorId ? updatedVendor : v
        );
        localStorage.setItem('vendorProfiles', JSON.stringify(updatedVendors));
        
        return updatedVendor;
    } catch (error) {
        throw error;
    }
}

async function deleteVendorProfile(vendorId) {
    try {
        const userId = localStorage.getItem('currentUserId');
        if (!userId) {
            throw new Error('User ID is required');
        }

        const vendorObjectType = `vendor:${userId}`;
        
        // Delete from trickle
        await trickleDeleteObject(vendorObjectType, vendorId);
        
        // Delete from localStorage
        const localVendors = JSON.parse(localStorage.getItem('vendorProfiles') || '[]');
        const updatedVendors = localVendors.filter(v => v.id !== vendorId);
        localStorage.setItem('vendorProfiles', JSON.stringify(updatedVendors));
        
        return true;
    } catch (error) {
        throw error;
    }
}

// Make functions available globally
window.getUserVendorProfiles = getUserVendorProfiles;
window.getVendorProfile = getVendorProfile;
window.createVendorProfile = createVendorProfile;
window.updateVendorProfile = updateVendorProfile;
window.deleteVendorProfile = deleteVendorProfile;

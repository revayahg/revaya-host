function VendorManagement({ eventId }) {
    try {
        const [assignedVendors, setAssignedVendors] = React.useState([]);
        const [loading, setLoading] = React.useState(true);
        const [removingVendorId, setRemovingVendorId] = React.useState(null);

        // Clean eventId immediately - EXACT same logic as AssignedVendorsList
        const cleanEventId = React.useMemo(() => {
            if (!eventId) return null;
            
            let cleaned = eventId.toString();
            
            // Remove any "/edit" suffix
            if (cleaned.includes('/edit')) {
                cleaned = cleaned.split('/edit')[0];
            }
            
            // Remove any "/view" suffix  
            if (cleaned.includes('/view')) {
                cleaned = cleaned.split('/view')[0];
            }
            
            // Remove query parameters and hash
            cleaned = cleaned.split('?')[0].split('#')[0].trim();
            
            
            return cleaned;
        }, [eventId]);

        const fetchVendors = async () => {
            try {
                setLoading(true);
                
                if (!cleanEventId) {
                    return;
                }


                const { data: invitations, error } = await window.supabaseClient
                    .from('event_invitations')
                    .select(`
                        *,
                        vendor_profiles (
                            id,
                            user_id,
                            company,
                            name,
                            email,
                            phone,
                            profile_picture_url,
                            category
                        )
                    `)
                    .eq('event_id', cleanEventId);

                if (error) {
                    throw error;
                }

                console.log('Assigned vendors:', invitations.map(inv => ({
                    id: inv.id,
                    response: inv.response,
                    vendor_name: inv.vendor_profiles?.company || inv.vendor_profiles?.name
                })));
                setAssignedVendors(invitations || []);
            } catch (error) {
                window.toast?.error('Failed to load vendors');
            } finally {
                setLoading(false);
            }
        };

        React.useEffect(() => {
            if (cleanEventId) {
                fetchVendors();
            }
        }, [cleanEventId]);

        // Listen for vendor events to update the list in real-time
        React.useEffect(() => {
            const handleVendorInvited = (event) => {
                if (event.detail && event.detail.eventId === cleanEventId) {
                    fetchVendors();
                }
            };

            const handleVendorAccepted = (event) => {
                if (event.detail && event.detail.eventId === cleanEventId) {
                    
                    // Update the status immediately without waiting for full refresh
                    setAssignedVendors(prevVendors => {
                        return prevVendors.map(vendor => {
                            if (vendor.id === event.detail.invitationId || 
                                vendor.vendor_profile_id === event.detail.vendorProfileId) {
                                return { ...vendor, response: 'accepted', status: 'accepted' };
                            }
                            return vendor;
                        });
                    });
                    
                    // Also do a full refresh to ensure data consistency
                    setTimeout(() => {
                        fetchVendors();
                    }, 500);
                }
            };

            const handleVendorDeclined = (event) => {
                if (event.detail && event.detail.eventId === cleanEventId) {
                    
                    // Update the status immediately without waiting for full refresh
                    setAssignedVendors(prevVendors => {
                        return prevVendors.map(vendor => {
                            if (vendor.id === event.detail.invitationId || 
                                vendor.vendor_profile_id === event.detail.vendorProfileId) {
                                return { ...vendor, response: 'declined', status: 'declined' };
                            }
                            return vendor;
                        });
                    });
                    
                    // Also do a full refresh to ensure data consistency
                    setTimeout(() => {
                        fetchVendors();
                    }, 500);
                }
            };

            const handleVendorDataChanged = (event) => {
                if (event.detail && event.detail.eventId === cleanEventId) {
                    fetchVendors();
                }
            };

            const handleForceRefresh = (event) => {
                if (event.detail && event.detail.eventId === cleanEventId) {
                    fetchVendors();
                }
            };

            // Add comprehensive event listeners
            window.addEventListener('vendorInvited', handleVendorInvited);
            window.addEventListener('vendorAccepted', handleVendorAccepted);
            window.addEventListener('vendorDeclined', handleVendorDeclined);
            window.addEventListener('vendorDataChanged', handleVendorDataChanged);
            window.addEventListener('forceVendorRefresh', handleForceRefresh);


            return () => {
                window.removeEventListener('vendorInvited', handleVendorInvited);
                window.removeEventListener('vendorAccepted', handleVendorAccepted);
                window.removeEventListener('vendorDeclined', handleVendorDeclined);
                window.removeEventListener('vendorDataChanged', handleVendorDataChanged);
                window.removeEventListener('forceVendorRefresh', handleForceRefresh);
            };
        }, [cleanEventId, fetchVendors]);

        const handleRemoveVendor = async (vendor) => {
            try {
                const vendorProfile = vendor.vendor_profiles;
                const vendorName = vendorProfile?.company || 
                                 vendorProfile?.name || 
                                 vendor.name ||
                                 'this vendor';
                
                if (!window.confirm(`Are you sure you want to remove ${vendorName} from this event?`)) {
                    return;
                }

                setRemovingVendorId(vendor.vendor_profile_id || vendor.id);

                // Remove the invitation record using clean event ID
                const { error } = await window.supabaseClient
                    .from('event_invitations')
                    .delete()
                    .eq('id', vendor.id);

                if (error) {
                    throw new Error(`Failed to remove vendor: ${error.message || 'Unknown error'}`);
                }
                
                // Update local state
                setAssignedVendors(prev => prev.filter(v => v.id !== vendor.id));

                window.toast?.success('Vendor removed successfully');
            } catch (error) {
                window.toast?.error(`Failed to remove vendor: ${error.message}`);
                reportError(error);
            } finally {
                setRemovingVendorId(null);
            }
        };


        if (loading) {
            return (
                <div className="text-center py-4">
                    <i className="fas fa-spinner fa-spin text-indigo-600"></i>
                </div>
            );
        }

        if (!assignedVendors || assignedVendors.length === 0) {
            return (
                <div className="bg-white rounded-lg p-6" data-name="vendor-management">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">Assigned Vendors</h2>
                        <span className="text-sm text-gray-600">0 vendors</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <i className="fas fa-users text-gray-400 text-3xl mb-2"></i>
                        <p className="text-gray-600">No vendors assigned to this event yet.</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-white rounded-lg p-6" data-name="vendor-management">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Assigned Vendors</h2>
                    <span className="text-sm text-gray-600">{assignedVendors.length} vendor{assignedVendors.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-3">
                {assignedVendors.map(vendor => {
                    const vendorProfile = vendor.vendor_profiles;
                    const isRemoving = removingVendorId === vendor.vendor_profile_id;
                    
                    return (
                        <div 
                            key={vendor.id || vendor.vendor_profile_id}
                            className="bg-gray-50 border rounded-lg p-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
                            data-name="vendor-card"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                    {vendorProfile?.profile_picture_url ? (
                                        <img
                                            src={vendorProfile.profile_picture_url}
                                            alt={vendorProfile.name || vendorProfile.company}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        <i className="fas fa-store text-gray-400 text-sm"></i>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-medium text-gray-900 text-sm truncate">
                                        {vendorProfile?.company || vendor.name || 'Unknown Vendor'}
                                    </h4>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-600 truncate">
                                            {vendorProfile?.email || vendor.email || 'No contact info'}
                                        </p>
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                            (vendor.response === 'accepted' || vendor.status === 'accepted') ? 'bg-green-100 text-green-800' :
                                            (vendor.response === 'declined' || vendor.status === 'declined') ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {vendor.response || vendor.status || 'pending'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <button
                                onClick={() => handleRemoveVendor(vendor)}
                                disabled={isRemoving}
                                className="text-red-600 hover:text-red-800 disabled:opacity-50 p-2 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                                title="Remove vendor from event"
                                data-name="remove-vendor-button"
                            >
                                {isRemoving ? (
                                    <i className="fas fa-spinner fa-spin text-sm"></i>
                                ) : (
                                    <i className="fas fa-trash-alt text-sm"></i>
                                )}
                            </button>
                        </div>
                    );
                })}
                </div>
            </div>
        );
    } catch (error) {
        reportError(error);
        return null;
    }
}

window.VendorManagement = VendorManagement;

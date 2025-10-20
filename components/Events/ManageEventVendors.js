// Safe dependency references
const React = window.React;
const { useEffect, useState } = React;

function ManageEventVendors({ eventId, onClose }) {
    try {
        const [vendors, setVendors] = useState([]);
        const [linkedVendorIds, setLinkedVendorIds] = useState(new Set());
        const [pendingVendorIds, setPendingVendorIds] = useState(new Set());
        const [loading, setLoading] = useState(true);
        const [removingVendorId, setRemovingVendorId] = useState(null);

        useEffect(() => {
            fetchData();

            // Set up real-time subscription for invitation changes
            const subscription = window.supabaseClient
                .channel(`invitation_changes_${eventId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'event_invitations',
                    filter: `event_id=eq.${eventId}`
                }, (payload) => {
                    setTimeout(() => {
                        fetchData();
                    }, 300);
                })
                .subscribe((status) => {
                });

            // Listen for multiple custom events for comprehensive updates
            const handleVendorStatusChange = (event) => {
                if (event.detail && event.detail.eventId === eventId) {
                    setTimeout(() => {
                        fetchData();
                    }, 200);
                }
            };

            const eventTypes = [
                'vendorAccepted',
                'vendorDeclined', 
                'vendorInvited',
                'invitationStatusChanged',
                'vendorDataChanged',
                'forceVendorRefresh'
            ];

            eventTypes.forEach(eventType => {
                window.addEventListener(eventType, handleVendorStatusChange);
            });

            // Cleanup subscription and event listeners on unmount
            return () => {
                if (subscription) {
                    subscription.unsubscribe();
                }
                eventTypes.forEach(eventType => {
                    window.removeEventListener(eventType, handleVendorStatusChange);
                });
            };
        }, [eventId]);

        const fetchData = async () => {
            try {
                // Fetch all vendors
                const { data: vendorsData, error: vendorsError } = await window.supabaseClient
                    .from('vendor_profiles')
                    .select('*')
                    .order('name');

                if (vendorsError) throw vendorsError;

                // Fetch existing vendor links
                const { data: linkedVendors, error: linksError } = await window.supabaseClient
                    .from('event_vendors')
                    .select('vendor_id')
                    .eq('event_id', eventId);

                if (linksError) throw linksError;

                // Fetch pending invitations
                const { data: pendingInvitations, error: invitationsError } = await window.supabaseClient
                    .from('event_invitations')
                    .select('vendor_profile_id, response')
                    .eq('event_id', eventId)
                    .in('response', ['pending', 'accepted']);

                if (invitationsError) throw invitationsError;

                // Combine linked vendors and pending invitations
                const linkedVendorIds = new Set(linkedVendors.map(link => link.vendor_id));
                const pendingVendorIds = new Set(
                    pendingInvitations
                        .filter(inv => inv.response === 'pending')
                        .map(inv => inv.vendor_profile_id)
                );
                const acceptedVendorIds = new Set(
                    pendingInvitations
                        .filter(inv => inv.response === 'accepted')
                        .map(inv => inv.vendor_profile_id)
                );

                // Add accepted invitations to linked vendors
                acceptedVendorIds.forEach(vendorId => linkedVendorIds.add(vendorId));

                setVendors(vendorsData || []);
                setLinkedVendorIds(linkedVendorIds);
                setPendingVendorIds(pendingVendorIds);
                setLoading(false);
            } catch (error) {
                window.toast?.error('Failed to load vendors');
                setLoading(false);
            }
        };

        const handleVendorToggle = async (vendorId) => {
            try {
                const isLinked = linkedVendorIds.has(vendorId);
                
                if (isLinked) {
                    // Show confirmation for removal
                    const vendor = vendors.find(v => v.id === vendorId);
                    const vendorName = vendor?.name || vendor?.business_name || 'this vendor';
                    
                    if (!window.confirm(`Are you sure you want to remove ${vendorName} from this event?`)) {
                        return;
                    }

                    setRemovingVendorId(vendorId);

                    // Remove vendor link
                    await window.EventVendorAPI.removeVendorFromEvent(eventId, vendorId);

                    const newLinkedVendors = new Set(linkedVendorIds);
                    newLinkedVendors.delete(vendorId);
                    setLinkedVendorIds(newLinkedVendors);
                    
                    // Force refresh of all components that depend on vendor lists
                    if (window.refreshVendorLists) {
                        window.refreshVendorLists(eventId);
                    }
                    
                    // Dispatch custom event to notify other components
                    window.dispatchEvent(new CustomEvent('vendorRemoved', { 
                        detail: { eventId, vendorId } 
                    }));
                    
                    window.toast?.success('Vendor removed successfully');
                } else {
                    // Add vendor link AND record as an accepted invitation so Access tab picks it up
                    const { error: linkErr } = await window.supabaseClient
                        .from('event_vendors')
                        .insert([{ event_id: eventId, vendor_id: vendorId }]);
                    if (linkErr) throw linkErr;

                    const { error: invErr } = await window.supabaseClient
                        .from('event_invitations')
                        .insert({
                            event_id: eventId,
                            vendor_profile_id: vendorId,
                            invite_type: 'vendor',
                            response: 'accepted'
                        });
                    if (invErr) throw invErr;

                    const newLinkedVendors = new Set(linkedVendorIds);
                    newLinkedVendors.add(vendorId);
                    setLinkedVendorIds(newLinkedVendors);
                    window.toast?.success('Vendor linked successfully');
                }
            } catch (error) {
                window.toast?.error('Failed to update vendor link');
            } finally {
                setRemovingVendorId(null);
            }
        };

        return (
            <div 
                className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
                data-name="manage-vendors-modal"
            >
                <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Manage Event Vendors</h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                            data-name="close-modal-button"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <i className="fas fa-spinner fa-spin text-indigo-600 text-2xl"></i>
                        </div>
                    ) : (
                        <div className="max-h-96 overflow-y-auto">
                            {vendors.length === 0 ? (
                                <p className="text-center text-gray-600 py-4">No vendors available</p>
                            ) : (
                                vendors.map(vendor => {
                                    const isLinked = linkedVendorIds.has(vendor.id);
                                    const isPending = pendingVendorIds.has(vendor.id);
                                    const isRemoving = removingVendorId === vendor.id;
                                    
                                    return (
                                        <div
                                            key={vendor.id}
                                            className={`flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg ${isPending ? 'bg-yellow-50 border border-yellow-200' : ''}`}
                                            data-name="vendor-item"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                    {vendor.logo ? (
                                                        <img
                                                            src={vendor.logo}
                                                            alt={vendor.name}
                                                            className="w-full h-full rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <i className="fas fa-store text-gray-400"></i>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-medium">{vendor.name}</h4>
                                                    <p className="text-sm text-gray-600">
                                                        {vendor.vendor_type}
                                                    </p>
                                                    {isPending && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                            <i className="fas fa-clock mr-1"></i>
                                                            Invitation Pending
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {isLinked && (
                                                    <button
                                                        onClick={() => handleVendorToggle(vendor.id)}
                                                        disabled={isRemoving}
                                                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                                        title="Remove vendor from event"
                                                        data-name="remove-vendor-button"
                                                    >
                                                        {isRemoving ? (
                                                            <i className="fas fa-spinner fa-spin"></i>
                                                        ) : (
                                                            <i className="fas fa-trash-alt"></i>
                                                        )}
                                                    </button>
                                                )}
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={isLinked}
                                                        onChange={() => handleVendorToggle(vendor.id)}
                                                        disabled={isRemoving}
                                                        data-name="vendor-toggle"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-disabled:opacity-50"></div>
                                                </label>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                            data-name="done-button"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        reportError(error);
        return null;
    }
}

// Register component globally
window.ManageEventVendors = ManageEventVendors;

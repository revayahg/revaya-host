function AssignedVendorsList({ eventId, assignedVendors = [], onVendorRemoved }) {
    const [removeModal, setRemoveModal] = React.useState({ isOpen: false, participant: null });
    
    const cleanEventId = eventId?.toString();

    try {
        return (
            <React.Fragment>
                <div className="bg-white rounded-lg p-6" data-name="assigned-vendors-list" data-file="components/Events/AssignedVendorsList.js">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Event Team</h3>
                        
                        {!assignedVendors || assignedVendors.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <div className="icon-users text-2xl mb-2"></div>
                                <p>No vendors assigned yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {assignedVendors.map((vendor) => {
                                    const vendorProfile = vendor.vendor_profiles;
                                    const vendorName = vendorProfile?.company || 
                                                     vendorProfile?.name || 
                                                     vendorProfile?.business_name ||
                                                     vendor.business_name ||
                                                     vendor.name ||
                                                     'Unknown Vendor';
                                    const vendorCategory = vendorProfile?.category || 
                                                          vendor.category || 
                                                          'Unknown Category';
                                    const vendorEmail = vendorProfile?.contact_email || 
                                                      vendor.contact_email || 
                                                      vendorProfile?.email ||
                                                      vendor.email;

                                    return (
                                        <div key={vendor.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                                    <div className="icon-briefcase text-indigo-600"></div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h4 className="font-medium text-gray-900">{vendorName}</h4>
                                                            <p className="text-sm text-gray-600">{vendorCategory}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                                                vendor.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                                vendor.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-gray-100 text-gray-800'
                                                            }`}>
                                                                {vendor.status}
                                                            </span>
                                                            <button
                                                                onClick={() => setRemoveModal({ isOpen: true, participant: vendor })}
                                                                className="p-1 text-gray-400 hover:text-red-600 rounded"
                                                                title="Remove from event"
                                                            >
                                                                <div className="icon-x text-sm"></div>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {vendorEmail && (
                                                        <p className="text-sm text-gray-500 mt-1">{vendorEmail}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <RemoveParticipantModal
                    isOpen={removeModal.isOpen}
                    onClose={() => setRemoveModal({ isOpen: false, participant: null })}
                    participant={removeModal.participant}
                    eventId={cleanEventId}
                    onRemoveSuccess={(removedVendor) => {
                        if (onVendorRemoved) {
                            onVendorRemoved(removedVendor.vendor_profile_id);
                        }
                    }}
                />
            </React.Fragment>
        );
    } catch (error) {
        return (
            <div className="bg-white rounded-lg p-6">
                <p className="text-red-600">Error loading vendor list</p>
            </div>
        );
    }
}

window.AssignedVendorsList = AssignedVendorsList;

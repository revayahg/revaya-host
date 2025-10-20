function MatchedVendorsSection({ matchedVendors, onRemoveVendor }) {
    try {
        const [removingVendorId, setRemovingVendorId] = React.useState(null);

        const handleRemoveVendor = async (vendor) => {
            try {
                if (!window.confirm(`Are you sure you want to remove ${vendor.name} from this event?`)) {
                    return;
                }

                setRemovingVendorId(vendor.vendorProfileId);
                
                if (onRemoveVendor) {
                    await onRemoveVendor(vendor.vendorProfileId, vendor.invitationId);
                }
            } catch (error) {
                window.toast?.error('Failed to remove vendor');
                reportError(error);
            } finally {
                setRemovingVendorId(null);
            }
        };

        if (!matchedVendors || matchedVendors.length === 0) {
            return (
                <div className="bg-white rounded-lg p-6" data-name="matched-vendors-section">
                    <h2 className="text-xl font-bold mb-4">Assigned Vendors</h2>
                    <div className="text-center py-8">
                        <i className="fas fa-users text-gray-400 text-4xl mb-4"></i>
                        <p className="text-gray-600">No vendors assigned to this event yet.</p>
                        <p className="text-sm text-gray-500 mt-2">Use the search above to invite vendors.</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-white rounded-lg p-6" data-name="matched-vendors-section">
                <h2 className="text-xl font-bold mb-4">Assigned Vendors ({matchedVendors.length})</h2>
                <div className="space-y-4">
                    {matchedVendors.map(vendor => {
                        const isRemoving = removingVendorId === vendor.vendorProfileId;
                        
                        return (
                            <div key={vendor.vendorProfileId} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg">{vendor.name}</h3>
                                        <p className="text-gray-600">{vendor.email}</p>
                                        <div className="flex items-center mt-2">
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                vendor.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                                vendor.status === 'declined' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {vendor.status === 'accepted' ? '✓ Accepted' :
                                                 vendor.status === 'declined' ? '✗ Declined' :
                                                 '⏳ Pending'}
                                            </span>
                                            {vendor.invited_at && (
                                                <span className="text-sm text-gray-500 ml-4">
                                                    Invited {new Date(vendor.invited_at).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveVendor(vendor)}
                                        disabled={isRemoving}
                                        className="ml-4 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                        title="Remove vendor from event"
                                    >
                                        {isRemoving ? (
                                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                        ) : (
                                            <i className="fas fa-trash-alt mr-2"></i>
                                        )}
                                        Remove
                                    </button>
                                </div>
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

window.MatchedVendorsSection = MatchedVendorsSection;

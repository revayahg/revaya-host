function VendorLinking({ eventId, onInviteSuccess }) {
    try {
        const [searchQuery, setSearchQuery] = React.useState('');
        const [searchResults, setSearchResults] = React.useState([]);
        const [loading, setLoading] = React.useState(false);
        const [inviting, setInviting] = React.useState(false);
        const context = React.useContext(window.AuthContext || React.createContext({}));
        const { user } = context;
        
        // Import shared invitation service
        const { sendInvitation } = window.InvitationEmailService;

        const generateInvitationLink = () => {
            return crypto.randomUUID();
        };

        const searchVendors = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            try {
                setLoading(true);
                const { data, error } = await window.supabaseClient
                    .from('vendor_profiles')
                    .select('id, name, company, email, category, location, user_id')
                    .or(`name.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`)
                    .limit(10);

                if (error) throw error;
                setSearchResults(data || []);
            } catch (error) {
                window.toast?.error('Failed to search vendors');
                reportError(error);
            } finally {
                setLoading(false);
            }
        };

        const inviteVendor = async (vendor) => {
            try {
                setInviting(true);
                
                // Generate unique invitation link
                const invitationLink = generateInvitationLink();

                // Use shared invitation service
                const result = await sendInvitation({
                    vendorName: vendor.name || vendor.company,
                    vendorEmail: vendor.email,
                    eventId,
                    invitationLink,
                    receivingUserId: vendor.user_id,
                    vendorProfileId: vendor.id,
                    requestingUserId: user.id
                });
                
                if (result.success) {
                    window.toast?.success(result.message || `Invitation sent to ${vendor.company || vendor.name}`);
                    setSearchQuery('');
                    setSearchResults([]);
                    
                    // Trigger parent refresh immediately
                    if (onInviteSuccess) {
                        await onInviteSuccess();
                    }
                } else {
                    throw new Error(result.error || 'Failed to send invitation');
                }
                
            } catch (error) {
                window.toast?.error(`Failed to invite vendor: ${error.message}`);
                reportError(error);
            } finally {
                setInviting(false);
            }
        };

        React.useEffect(() => {
            const debounceTimer = setTimeout(searchVendors, 300);
            return () => clearTimeout(debounceTimer);
        }, [searchQuery]);

        return (
            <div className="bg-white p-6 rounded-lg shadow-sm" data-name="vendor-linking" data-file="components/Events/VendorLinking.js">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <i className="fas fa-search mr-2 text-indigo-600"></i>
                    Search and Invite Vendors
                </h2>
                
                <div className="space-y-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search vendors by name, company, category, or location..."
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        {loading && (
                            <div className="absolute right-3 top-3">
                                <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                            </div>
                        )}
                    </div>

                    {searchResults.length > 0 && (
                        <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                            {searchResults.map(vendor => (
                                <div key={vendor.id} className="p-3 border-b border-gray-100 last:border-b-0 flex justify-between items-center hover:bg-gray-50">
                                    <div>
                                        <h4 className="font-medium">{vendor.company || vendor.name}</h4>
                                        <p className="text-sm text-gray-600">{vendor.category || 'General Services'} • {vendor.location || 'Location not specified'}</p>
                                        <p className="text-sm text-gray-500">{vendor.email}</p>
                                    </div>
                                    <button
                                        onClick={() => inviteVendor(vendor)}
                                        disabled={inviting}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                    >
                                        {inviting ? (
                                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                        ) : (
                                            <i className="fas fa-plus mr-2"></i>
                                        )}
                                        Invite
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {searchQuery && !loading && searchResults.length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                            No vendors found matching "{searchQuery}"
                        </div>
                    )}
                </div>
            </div>
        );
    } catch (error) {
        reportError(error);
        return null;
    }
}

window.VendorLinking = VendorLinking;

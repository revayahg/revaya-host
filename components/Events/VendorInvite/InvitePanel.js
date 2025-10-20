function InvitePanel({ eventId, onInviteSuccess }) {
  try {
    const context = React.useContext(window.AuthContext || React.createContext({}));
    const { user } = context;
    
    if (!user || !user.id) {
      return React.createElement('div', { className: 'p-4 text-red-600' }, 
        'Please log in to send invitations.'
      );
    }
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedCategory, setSelectedCategory] = React.useState('');
    const [vendors, setVendors] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [selectedVendor, setSelectedVendor] = React.useState(null);
    const [showServiceModal, setShowServiceModal] = React.useState(false);
    const [selectedServices, setSelectedServices] = React.useState([]);
    const [event, setEvent] = React.useState(null);

    React.useEffect(() => {
      loadEventDetails();
    }, [eventId]);

    const loadEventDetails = async () => {
      try {
        const { data, error } = await window.supabaseClient
          .from('events')
          .select('name, start_date, location')
          .eq('id', eventId)
          .single();

        if (error) throw error;
        setEvent(data);
      } catch (error) {
      }
    };

    const searchVendors = async (term) => {
      try {
        setLoading(true);
        const { data } = await window.supabaseClient
          .from('vendor_profiles')
          .select('id, name, company, email, user_id')
          .or(`name.ilike.%${term}%,company.ilike.%${term}%`)
          .limit(10);
        
        const filteredVendors = (data || []).filter(vendor => {
          const matchesSearch = vendor.name?.toLowerCase().includes(term.toLowerCase()) ||
                              vendor.company?.toLowerCase().includes(term.toLowerCase());
          const matchesCategory = !selectedCategory || 
                                vendor.category === selectedCategory;
          return matchesSearch && matchesCategory;
        });
        
        setVendors(filteredVendors);
      } catch (error) {
        console.error('Invite panel error:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
          error: error
        });
        
        const errorMessage = error.message || 'Unknown error occurred';
        window.toast?.error(`Failed to invite vendor: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    React.useEffect(() => {
      if (searchTerm) {
        const debounce = setTimeout(() => searchVendors(searchTerm), 300);
        return () => clearTimeout(debounce);
      } else {
        setVendors([]);
      }
    }, [searchTerm, selectedCategory]);

    const handleInvite = async () => {
      try {
        if (!selectedVendor || selectedServices.length === 0 || !event) {
          window.toast?.error('Please select services to request');
          return;
        }

        if (!user?.id) {
          window.toast?.error('Please sign in to send invitations');
          return;
        }

        if (!selectedVendor.user_id) {
          window.toast?.error('Vendor profile error - cannot send invitation');
          return;
        }

        const invitationId = crypto.randomUUID();

        console.log('Sending vendor invitation:', {
          requestingUserId: user?.id,
          receivingUserId: selectedVendor?.user_id,
          vendorProfileId: selectedVendor?.id
        });
        
        const result = await window.InvitationEmailService.sendInvitation({
          requestingUserId: user.id,
          receivingUserId: selectedVendor.user_id,
          vendorName: selectedVendor.name || selectedVendor.company,
          vendorEmail: selectedVendor.email,
          eventId,
          invitationLink: invitationId,
          vendorProfileId: selectedVendor.id
        });

        if (result.success) {
          window.toast?.success(`Invitation sent to ${selectedVendor.name || selectedVendor.company}`);
          
          console.log('Invitation sent successfully:', {
            acceptUrl: result.acceptUrl,
            declineUrl: result.declineUrl,
            vendor: selectedVendor.name || selectedVendor.company
          });
          
          // Dispatch real-time event to notify other components
          window.dispatchEvent(new CustomEvent('vendorInvitationSent', {
            detail: {
              eventId: eventId,
              vendorProfileId: selectedVendor.id,
              vendorName: selectedVendor.name || selectedVendor.company,
              services: selectedServices
            }
          }));
          
          // Clear form state
          setSelectedVendor(null);
          setSelectedServices([]);
          setShowServiceModal(false);
          
          // Trigger multiple updates for real-time UI refresh
          if (onInviteSuccess) {
            onInviteSuccess();
          }
          
          // Dispatch vendor invited event for real-time updates immediately
          window.dispatchEvent(new CustomEvent('vendorInvited', {
            detail: {
              eventId: eventId,
              vendorId: selectedVendor.id,
              vendorProfileId: selectedVendor.id,
              vendorName: selectedVendor.name || selectedVendor.company
            }
          }));
          
          // Also dispatch general vendor data change event
          window.dispatchEvent(new CustomEvent('vendorDataChanged', {
            detail: { 
              eventId: eventId,
              vendorProfileId: selectedVendor.id 
            }
          }));
          
          // Force refresh with a slight delay to ensure all components catch the event
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('forceVendorRefresh', {
              detail: { eventId: eventId }
            }));
          }, 200);
          
        } else {
          throw new Error('Failed to send invitation');
        }
      } catch (error) {
        window.toast?.error('Failed to create invitation');
      }
    };

    const handleServiceToggle = (service) => {
      setSelectedServices(prev => 
        prev.includes(service)
          ? prev.filter(s => s !== service)
          : [...prev, service]
      );
    };

    return (
      <div data-name="invite-panel" className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search vendors by name or company..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Categories</option>
            {Object.entries(window.VENDOR_CATEGORIES || {}).map(([category]) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <i className="fas fa-spinner fa-spin text-indigo-600"></i>
          </div>
        ) : vendors.length > 0 ? (
          <div className="border rounded-lg divide-y">
            {vendors.map(vendor => (
              <div 
                key={vendor.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div>
                  <h3 className="font-medium">{vendor.name || vendor.company}</h3>
                  <p className="text-sm text-gray-600">{vendor.email}</p>
                  <p className="text-sm text-gray-500">{vendor.category}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedVendor(vendor);
                    setShowServiceModal(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Invite
                </button>
              </div>
            ))}
          </div>
        ) : searchTerm && (
          <div className="text-center py-4 text-gray-500">
            No vendors found
          </div>
        )}

        {/* Service Selection Modal */}
        {showServiceModal && selectedVendor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium mb-4">
                Select Services for {selectedVendor.name || selectedVendor.company}
              </h3>
              
              <div className="space-y-4 mb-6">
                {Object.entries(window.VENDOR_CATEGORIES || {})
                  .filter(([category]) => 
                    category === selectedVendor.category ||
                    category === 'Other'
                  )
                  .map(([category, services]) => (
                    <div key={category}>
                      <h4 className="font-medium text-gray-700 mb-2">{category}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {(services || []).map(service => (
                          <label
                            key={service.name}
                            className={`flex items-center p-2 rounded border cursor-pointer ${
                              selectedServices.includes(service.name)
                                ? 'bg-indigo-50 border-indigo-500'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedServices.includes(service.name)}
                              onChange={() => handleServiceToggle(service.name)}
                              className="sr-only"
                            />
                            <span className="mr-2">{service.icon}</span>
                            <span className="text-sm">{service.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowServiceModal(false);
                    setSelectedVendor(null);
                    setSelectedServices([]);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={selectedServices.length === 0}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.InvitePanel = InvitePanel;

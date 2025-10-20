function AssignVendorModal({ isOpen, onClose, eventId, onVendorAssigned }) {
  try {
    const context = React.useContext(window.AuthContext || React.createContext({}));
    const { user } = context;
    const [vendors, setVendors] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [assigning, setAssigning] = React.useState(null);
    const [assignedVendorIds, setAssignedVendorIds] = React.useState(new Set());

    React.useEffect(() => {
      if (isOpen) {
        fetchVendors();
      }
    }, [isOpen]);

    const fetchVendors = async () => {
      try {
        setLoading(true);
        
        // Fetch all vendors and currently invited vendors
        const [allVendorsResult, invitedVendorsResult] = await Promise.all([
          window.supabaseClient
            .from('vendor_profiles')
            .select('id, name, company, profile_picture_url, email, user_id')
            .order('name'),
          window.supabaseClient
            .from('event_invitations')
            .select('vendor_profile_id')
            .eq('event_id', eventId)
        ]);

        if (allVendorsResult.error) throw allVendorsResult.error;
        
        const allVendors = allVendorsResult.data || [];
        const invitedVendors = invitedVendorsResult.data || [];
        
        // Create set of invited vendor profile IDs
        const invitedIds = new Set(invitedVendors.map(iv => iv.vendor_profile_id));
        
        setVendors(allVendors);
        setAssignedVendorIds(invitedIds);
        
      } catch (error) {
        window.toast?.error('Failed to load vendors');
      } finally {
        setLoading(false);
      }
    };

    const handleAssignVendor = async (vendor) => {
      try {
        setAssigning(vendor.id);
        
        // Generate unique invitation link
        const invitationLink = `inv_${crypto.randomUUID()}`;
        
        // Insert into event_invitations with select to get back the row
        const { data: invite, error: dbErr } = await window.supabaseClient
          .from('event_invitations')
          .insert({
            event_invitation_link: invitationLink,
            event_id: eventId,
            vendor_profile_id: vendor.id,
            requesting_user_id: user.id,
            receiving_user_id: vendor.user_id,
            invite_timestamp: new Date().toISOString(),
            email_delivery_status: 'pending',
            email_opened: false,
            response: 'pending'
          })
          .select()
          .maybeSingle();

        if (dbErr) throw dbErr;

        // Send invitation email using Supabase Functions SDK
        const inviteUrl = `https://7t7d38mcv21n.trickle.host/invite/${invitationLink}`;
        const subject = `You're invited to an event on Revaya Host!`;
        const text = `Hi ${vendor.name || vendor.company},\nYou've been invited to join an event as a vendor.\n\nAccept or decline: ${inviteUrl}`;
        const html = `
          <h2 style="font-family:sans-serif;">You've been invited to join an event as a vendor!</h2>
          <p>Please click below to view and accept the invitation:</p>
          <a href="${inviteUrl}" style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:20px 0;">View Invitation & Accept</a>
          <p>If you do not recognize this invitation, you can safely ignore this email.</p>
        `;

        try {
          const { data, error } = await window.supabaseClient
            .functions
            .invoke('send-invitation-email', {
              body: { 
                to: vendor.email, 
                subject, 
                text, 
                html, 
                invitationId: invite.id 
              }
            });

          if (error) {
            window.toast?.error('Invitation created but email failed to send');
          } else {
            window.toast?.success('Vendor invitation sent successfully!');
          }
        } catch (functionError) {
          window.toast?.error('Failed to send invitation email');
        }

        setAssignedVendorIds(prev => new Set([...prev, vendor.id]));
        onVendorAssigned();
        onClose();
      } catch (error) {
        window.toast?.error(error.message || 'Failed to assign vendor');
      } finally {
        setAssigning(null);
      }
    };

    const filteredVendors = vendors.filter(vendor => {
      const matchesSearch = vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           vendor.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           vendor.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const notInvited = !assignedVendorIds.has(vendor.id);
      
      return matchesSearch && notInvited;
    });

    return (
      <window.Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Invite Vendor to Event"
        size="lg"
      >
        <div data-name="assign-vendor-modal" className="p-6">
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search vendors by name, company, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-search text-3xl mb-2"></i>
                <p>{searchTerm ? 'No matching vendors found' : 'All available vendors have been invited'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredVendors.map((vendor) => (
                  <div key={vendor.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      {vendor.profile_picture_url ? (
                        <img
                          src={vendor.profile_picture_url}
                          alt={vendor.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <i className="fas fa-user text-gray-400"></i>
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium text-gray-900">{vendor.name}</h3>
                        <p className="text-sm text-gray-500">{vendor.company || 'No company'}</p>
                        <p className="text-sm text-gray-500">{vendor.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssignVendor(vendor)}
                      disabled={assigning === vendor.id}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {assigning === vendor.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Inviting...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane mr-2"></i>
                          Invite
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </window.Modal>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.AssignVendorModal = AssignVendorModal;

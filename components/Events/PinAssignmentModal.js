function PinAssignmentModal({ isOpen, onClose, onSave, x, y, eventId, existingPin = null }) {
  try {
    const [selectedVendorId, setSelectedVendorId] = React.useState(existingPin?.assignee_vendor_id || '');
    const [notes, setNotes] = React.useState(existingPin?.notes || '');
    const [isLoading, setIsLoading] = React.useState(false);
    const [assignedVendors, setAssignedVendors] = React.useState([]);
    const [loadingVendors, setLoadingVendors] = React.useState(false);

    React.useEffect(() => {
      if (isOpen) {
        setSelectedVendorId(existingPin?.assignee_vendor_id || '');
        setNotes(existingPin?.notes || '');
        if (eventId) {
          loadAssignedVendors();
        }
      }
    }, [isOpen, existingPin, eventId]);

    const loadAssignedVendors = async () => {
      try {
        setLoadingVendors(true);
        
        // Get vendors from event_invitations table with vendor profile data
        const { data: invitations, error } = await window.supabaseClient
          .from('event_invitations')
          .select(`
            vendor_profile_id,
            response,
            vendor_profiles (
              id,
              name,
              company,
              email
            )
          `)
          .eq('event_id', eventId);


        if (error) {
          return;
        }

        if (invitations && invitations.length > 0) {
          const vendors = invitations.map(invitation => {
            const profile = invitation.vendor_profiles;
            return {
              id: invitation.vendor_profile_id,
              name: profile?.company || profile?.name || 'Unknown Vendor',
              email: profile?.email || '',
              status: invitation.response || 'pending'
            };
          });
          setAssignedVendors(vendors);
        } else {
          setAssignedVendors([]);
        }
      } catch (error) {
        setAssignedVendors([]);
      } finally {
        setLoadingVendors(false);
      }
    };

    const handleSave = async () => {
      try {
        setIsLoading(true);
        
        // Validate required data
        if (x === undefined || y === undefined) {
          throw new Error('Pin coordinates are required');
        }
        
        if (!eventId) {
          throw new Error('Event ID is required');
        }
        
        const pinData = {
          x: parseFloat(x),
          y: parseFloat(y),
          assignee_vendor_id: null, // Since we're using text input, don't pass vendor ID
          notes: selectedVendorId ? `Assigned to: ${selectedVendorId}\n${notes.trim()}` : notes.trim(),
          visible_to_vendor: true
        };
        
        
        await onSave(pinData);
        onClose();
      } catch (error) {
        alert(`Failed to save pin: ${error.message || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (!isOpen) return null;

    return React.createElement('div', {
      className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
      onClick: (e) => e.target === e.currentTarget && onClose()
    },
      React.createElement('div', {
        className: 'bg-white rounded-lg p-6 w-96 max-w-full mx-4'
      },
        React.createElement('h3', {
          className: 'text-lg font-semibold mb-4'
        }, existingPin ? 'Edit Pin Assignment' : 'Assign Pin to Vendor'),
        
        React.createElement('div', {
          className: 'mb-4'
        },
          React.createElement('label', {
            className: 'block text-sm font-medium text-gray-700 mb-2'
          }, 'Assign to Vendor'),
          React.createElement('input', {
            type: 'text',
            value: selectedVendorId,
            onChange: (e) => setSelectedVendorId(e.target.value),
            placeholder: 'Enter vendor name or company',
            className: 'w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500'
          })
        ),

        React.createElement('div', {
          className: 'mb-6'
        },
          React.createElement('label', {
            className: 'block text-sm font-medium text-gray-700 mb-2'
          }, 'Notes'),
          React.createElement('textarea', {
            value: notes,
            onChange: (e) => setNotes(e.target.value),
            placeholder: 'Add notes about this location...',
            rows: 3,
            className: 'w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500'
          })
        ),

        React.createElement('div', {
          className: 'flex justify-end space-x-3'
        },
          React.createElement('button', {
            onClick: onClose,
            disabled: isLoading,
            className: 'px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50'
          }, 'Cancel'),
          React.createElement('button', {
            onClick: handleSave,
            disabled: isLoading || loadingVendors,
            className: 'px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50'
          }, isLoading ? 'Saving...' : 'Save Pin')
        )
      )
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.PinAssignmentModal = PinAssignmentModal;

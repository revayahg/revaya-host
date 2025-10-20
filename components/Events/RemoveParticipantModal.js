function RemoveParticipantModal({ 
    isOpen, 
    onClose, 
    participant, 
    eventId, 
    onRemoveSuccess 
}) {
    const [isRemoving, setIsRemoving] = React.useState(false);

    const handleRemove = async () => {
        if (!participant || !eventId) return;
        
        setIsRemoving(true);
        try {
            const supabaseClient = initSupabase();
            if (!supabaseClient) {
                throw new Error('Database connection failed');
            }

            // Remove from event_vendors table
            const { error: removeError } = await supabaseClient
                .from('event_vendors')
                .delete()
                .eq('event_id', eventId)
                .eq('vendor_profile_id', participant.vendor_profile_id);

            if (removeError) {
                throw removeError;
            }

            // Reassign tasks that were assigned to this vendor
            const { error: taskError } = await supabaseClient
                .from('tasks')
                .update({ 
                    assigned_vendor_id: null,
                    status: 'pending'
                })
                .eq('event_id', eventId)
                .eq('assigned_vendor_id', participant.vendor_profile_id);

            if (taskError) {
            }

            // Remove any pins associated with this vendor
            const { error: pinError } = await supabaseClient
                .from('pins')
                .delete()
                .eq('event_id', eventId)
                .eq('vendor_profile_id', participant.vendor_profile_id);

            if (pinError) {
            }

            showToast(`${participant.business_name || 'Participant'} removed from event`, 'success');
            
            // Dispatch event for real-time updates
            window.dispatchEvent(new CustomEvent('vendorRemoved', {
                detail: { 
                    eventId, 
                    vendorProfileId: participant.vendor_profile_id,
                    participantName: participant.business_name || 'Participant'
                }
            }));

            onRemoveSuccess?.(participant);
            onClose();

        } catch (error) {
            showToast('Failed to remove participant. Please try again.', 'error');
        } finally {
            setIsRemoving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-name="remove-participant-modal" data-file="components/Events/RemoveParticipantModal.js">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center mb-4">
                    <div className="icon-alert-triangle text-xl text-red-500 mr-3"></div>
                    <h3 className="text-lg font-semibold text-gray-900">Remove Participant</h3>
                </div>
                
                <p className="text-gray-600 mb-6">
                    Are you sure you want to remove <span className="font-medium">{participant?.business_name || 'this participant'}</span> from the event? 
                    This will also unassign any tasks currently assigned to them.
                </p>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        disabled={isRemoving}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleRemove}
                        disabled={isRemoving}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isRemoving && <div className="icon-loader-2 text-sm animate-spin"></div>}
                        {isRemoving ? 'Removing...' : 'Remove'}
                    </button>
                </div>
            </div>
        </div>
    );
}
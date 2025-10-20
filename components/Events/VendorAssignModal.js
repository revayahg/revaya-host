function VendorAssignModal({ vendor, eventId, user, onClose, onConfirmAssign }) {
  try {
    const [loading, setLoading] = React.useState(false);

    const handleConfirm = async () => {
      if (!user || !user.id) {
        window.toast?.error('You must be logged in to assign a vendor.');
        return;
      }

      try {
        setLoading(true);
        // Call the confirm assign function from parent
        await onConfirmAssign();
        // Modal will be closed by parent component after successful assignment
      } catch (error) {
        window.toast?.error('Failed to assign vendor');
      } finally {
        setLoading(false);
      }
    };

    const handleClose = () => {
      if (!loading) {
        onClose();
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" data-name="vendor-assign-modal" data-file="components/Events/VendorAssignModal.js">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-medium mb-4">
            Invite {vendor.name || vendor.company}?
          </h3>
          
          <p className="text-gray-600 mb-6">
            This will send an invitation to the vendor. They will appear as "pending" until they accept the invitation.
          </p>

          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Sending...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2"></i>
                  Send Invitation
                </>
              )}
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

window.VendorAssignModal = VendorAssignModal;

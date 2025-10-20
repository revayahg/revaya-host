function CollaboratorItem({ collaborator, eventId, canManage }) {
    const [updating, setUpdating] = React.useState(false);
    const [showRemoveModal, setShowRemoveModal] = React.useState(false);

    const handleRoleChange = async (newRole) => {
        try {
            setUpdating(true);
            
            if (collaborator.status === 'pending') {
                // Use the _invitationId field for pending invitations
                const invitationId = collaborator._invitationId || collaborator.id;
                await window.collaboratorAPI.updateInvitationRole(invitationId, newRole);
            } else {
                await window.collaboratorAPI.updateRole(eventId, collaborator.user_id, newRole);
            }
            
            window.showToast && window.showToast('Role updated successfully', 'success');
            window.dispatchEvent(new CustomEvent('collaboratorUpdated', { detail: { eventId } }));
        } catch (error) {
            window.showToast && window.showToast('Failed to update role', 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handleRemove = async () => {
        try {
            setUpdating(true);
            
            if (collaborator.status === 'pending') {
                
                // For pending invitations, try multiple ID sources
                const invitationId = collaborator._invitationId || 
                                   collaborator.invitation_id || 
                                   collaborator.id ||
                                   collaborator.invitation_token;
                
                
                if (!invitationId) {
                    // Instead of throwing error, try to refresh the collaborator list
                    window.showToast && window.showToast('Unable to cancel - refreshing list...', 'info');
                    window.dispatchEvent(new CustomEvent('collaboratorUpdated', { detail: { eventId } }));
                    setShowRemoveModal(false);
                    return;
                }
                
                const result = await window.collaboratorAPI.cancelInvitation(eventId, invitationId);
                
                if (result && result.warning) {
                    window.showToast && window.showToast('Invitation already processed or expired', 'info');
                } else {
                    window.showToast && window.showToast('Invitation cancelled', 'success');
                }
            } else {
                
                if (!collaborator.user_id) {
                    throw new Error('Cannot remove collaborator: No user ID found');
                }
                
                await window.collaboratorAPI.removeCollaborator(eventId, collaborator.user_id);
                window.showToast && window.showToast('Collaborator removed', 'success');
            }
            
            // Trigger UI update
            window.dispatchEvent(new CustomEvent('collaboratorUpdated', { detail: { eventId } }));
            setShowRemoveModal(false);
        } catch (error) {
            const errorMessage = error.message || 'Failed to remove collaborator';
            window.showToast && window.showToast(errorMessage, 'error');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
        <div className="font-medium text-gray-900 flex items-center gap-2">
          <span>
            {collaborator.displayName ||
             collaborator.email ||
             (collaborator.user_id ? `User ${collaborator.user_id.slice(0,8)}` : 'Unknown User')}
          </span>
          {collaborator.role === 'admin' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
              Owner
            </span>
          )}
        </div>
                <div className="text-sm text-gray-500">
                    {collaborator.email && collaborator.email !== collaborator.displayName && (
                        <div>{collaborator.email}</div>
                    )}
                    {collaborator.company_name && (
                        <div>{collaborator.company_name}</div>
                    )}
                    <div className="text-xs">
                        {collaborator.status === 'pending' ? 'Pending invitation' : 'Active member'}
                    </div>
                </div>
            </div>
            
            {canManage && (
                <div className="flex items-center space-x-2">
                    <select
                        value={collaborator.role}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        disabled={updating || collaborator.role === 'admin'}
                        className="text-sm border border-gray-300 rounded px-2 py-1 disabled:opacity-50"
                    >
                        {collaborator.role === 'admin' ? (
                            <option value="admin">Owner</option>
                        ) : (
                            <>
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                            </>
                        )}
                    </select>
                    
                    {collaborator.role !== 'admin' && (
                        <button
                            onClick={() => {
                                setShowRemoveModal(true);
                            }}
                            disabled={updating}
                            className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed p-1"
                        >
                            {updating ? (
                                <div className="icon-loader-2 text-sm animate-spin"></div>
                            ) : (
                                <div className="icon-trash-2 text-sm"></div>
                            )}
                        </button>
                    )}
                </div>
            )}
            
            {showRemoveModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-2">Remove Collaborator</h3>
                        <p className="text-gray-600 mb-4">
                            Are you sure you want to remove {collaborator.displayName || collaborator.email} from this event?
                        </p>
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => setShowRemoveModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                disabled={updating}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRemove}
                                disabled={updating}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                                {updating ? 'Removing...' : 'Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

window.CollaboratorItem = CollaboratorItem;
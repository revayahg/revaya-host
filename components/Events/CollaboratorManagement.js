function CollaboratorManagement({ eventId, onClose, canManageCollaborators = false, permissionsReady = true }) {
    const [collaborators, setCollaborators] = React.useState([]);
    const [pendingInvitations, setPendingInvitations] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [showInviteForm, setShowInviteForm] = React.useState(false);

    // Define loadCollaboratorData function first
    const loadCollaboratorData = React.useCallback(async () => {
        if (!eventId || !window.collaboratorAPI) {
            return;
        }
        
        try {
            setLoading(true);
            
            // Ensure event owner has proper role in event_user_roles
            await window.collaboratorAPI.ensureEventOwnerRole(eventId);
            
            const [collaboratorsData, invitationsData] = await Promise.all([
                window.collaboratorAPI.getCollaborators(eventId),
                window.collaboratorAPI.getPendingInvitations(eventId)
            ]);
            
            // Filter out any invalid or duplicate collaborators - ONLY active members
            let validCollaborators = (collaboratorsData || []).filter((collaborator, index, array) => {
                if (!collaborator.user_id) return false;
                if (collaborator.status === 'pending') return false;
                return array.findIndex(c => c.user_id === collaborator.user_id) === index;
            });
            
            // Filter out invalid or duplicate invitations - ONLY pending invitations
            const validInvitations = (invitationsData || []).filter((invitation, index, array) => {
                const hasRequiredFields = invitation.email && invitation.id;
                if (!hasRequiredFields) return false;
                if (invitation.status !== 'pending') return false;
                return array.findIndex(i => i.id === invitation.id) === index;
            });
            
            // Debug logging for invitation data
            console.log('Valid invitations:', 
                validInvitations.map(inv => ({
                    id: inv.id,
                    invitation_token: inv.invitation_token,
                    email: inv.email,
                    status: inv.status,
                    created_at: inv.created_at
                }))
            );
            
            // Cross-filter: Remove any collaborators that have matching pending invitations
            const invitationEmails = validInvitations.map(inv => inv.email.toLowerCase());
            validCollaborators = validCollaborators.filter(collaborator => {
                if (collaborator.email && invitationEmails.includes(collaborator.email.toLowerCase())) {
                    return false;
                }
                return true;
            });
            
            setCollaborators(validCollaborators);
            setPendingInvitations(validInvitations);
        } catch (error) {
            setCollaborators([]);
            setPendingInvitations([]);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    // Permission check effect - wait until data is ready before showing errors
    React.useEffect(() => {
        if (!permissionsReady) return; // wait until role/owner known
        if (!canManageCollaborators) {
            window.toast && window.toast.show('You do not have permission to manage collaborators.', 'info');
            try { 
                window.location.hash = `#/event/view/${eventId}`; 
            } catch {}
        }
    }, [permissionsReady, canManageCollaborators, eventId]);

    React.useEffect(() => {
        loadCollaboratorData();
        
        // Single event listener with proper cleanup
        const handleUpdate = (event) => {
            if (event.detail?.eventId === eventId || !event.detail?.eventId) {
                loadCollaboratorData();
            }
        };
        
        // Clean setup - no duplicate listeners
        window.addEventListener('collaboratorUpdated', handleUpdate);
        
        return () => {
            window.removeEventListener('collaboratorUpdated', handleUpdate);
        };
    }, [eventId, loadCollaboratorData]);

    // Guard returns to avoid rendering when not ready/allowed
    if (!permissionsReady) return null;
    if (!canManageCollaborators) return null;

    if (loading) {
        return (
            <div className="text-center py-4">
                <div className="icon-loader-2 text-xl animate-spin text-gray-400"></div>
                <p className="text-xs text-gray-500 mt-2">Loading collaborators...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h4 className="font-medium">Event Collaborators</h4>
                    <p className="text-sm text-gray-500">
                        {collaborators.length} active, {pendingInvitations.length} pending
                    </p>
                </div>
                <button
                    onClick={() => setShowInviteForm(true)}
                    className="text-sm bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700"
                    style={{ display: canManageCollaborators ? 'inline-block' : 'none' }}
                >
                    Invite
                </button>
            </div>

            {/* Active Collaborators */}
            <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-700">Active Members</h5>
                {collaborators.length === 0 ? (
                    <div className="text-sm text-gray-500">
                        <p>No active collaborators found</p>
                    </div>
                ) : (
                    <div>
                        {collaborators.map((collaborator, index) => {
                            return (
                                window.CollaboratorItem && React.createElement(window.CollaboratorItem, {
                                    key: `collaborator-${eventId}-${collaborator.id || collaborator.user_id || collaborator.email || index}-${Date.now()}-${index}`,
                                    collaborator: {
                                        ...collaborator,
                                        status: 'active',
                                        displayName: collaborator.displayName || collaborator.email || `User ${collaborator.user_id?.slice(0, 8)}`,
                                        email: collaborator.email,
                                        role: collaborator.role
                                    },
                                    eventId,
                                    canManage: canManageCollaborators
                                })
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
                <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Pending Invitations</h5>
                    {pendingInvitations.map((invitation, index) => {
                        console.log('Processing invitation:', {
                            originalId: invitation.id,
                            originalToken: invitation.invitation_token,
                            email: invitation.email,
                            status: invitation.status
                        });
                        
                        const collaboratorData = {
                            ...invitation,
                            status: 'pending',
                            displayName: invitation.email,
                            email: invitation.email,
                            role: invitation.role,
                            // Ensure all ID fields are preserved
                            _invitationId: invitation.id,
                            invitation_id: invitation.id,
                            invitation_token: invitation.invitation_token,
                            // Add original object for debugging
                            _originalInvitation: invitation
                        };
                        
                        
                        return window.CollaboratorItem && React.createElement(window.CollaboratorItem, {
                            key: `invitation-${eventId}-${invitation.id || invitation.invitation_token || index}-${Date.now()}-${index}`,
                            collaborator: collaboratorData,
                            eventId,
                            canManage: canManageCollaborators
                        });
                    })}
                </div>
            )}

            {/* Invite Form Modal */}
            {showInviteForm && window.InviteCollaboratorForm && (
                React.createElement(window.InviteCollaboratorForm, {
                    eventId,
                    onClose: () => setShowInviteForm(false),
                    onSuccess: () => {
                        setShowInviteForm(false);
                        loadCollaboratorData();
                    }
                })
            )}
        </div>
    );
}

window.CollaboratorManagement = CollaboratorManagement;
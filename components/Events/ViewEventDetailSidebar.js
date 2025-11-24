function ViewEventDetailSidebar({ event, currentTotals, editingBudget, handleEditBudget, handleSaveBudget, handleCancelBudget, handleTotalsChange, onEventUpdate, eventDates, canViewBudget = true, userRole: roleProp, isOwner: isOwnerProp, loadingRole: loadingRoleProp }) {
    try {
    const [showCollaboratorManagement, setShowCollaboratorManagement] = React.useState(false);
    const [collaborators, setCollaborators] = React.useState([]);

        const context = React.useContext(window.AuthContext || React.createContext({}));
        const { user } = context;
        
        // Early return if no user
        if (!user) {
            return React.createElement('div', { 
                className: 'p-4 text-center text-gray-500' 
            }, 'Please log in to view event details.');
        }

        // NEW: derive from props; fetch only if missing
        const derivedIsOwner = typeof isOwnerProp === 'boolean'
            ? isOwnerProp
            : !!(event && user && (event.user_id === user.id || event.created_by === user.id));

        const [userRole, setUserRole] = React.useState(roleProp ?? null);
        const [roleLoading, setRoleLoading] = React.useState(roleProp == null && loadingRoleProp !== false);

        React.useEffect(() => {
            setUserRole(roleProp ?? null);
            setRoleLoading(roleProp == null && loadingRoleProp !== false);
        }, [roleProp, loadingRoleProp]);

        React.useEffect(() => {
            if (roleProp != null || !event?.id || !user?.id) { 
                setRoleLoading(false); 
                return; 
            }
            let cancelled = false;
            (async () => {
                setRoleLoading(true);
                const r = await window.RoleAPI?.getRole(event.id);
                if (!cancelled) { 
                    setUserRole(r); 
                    setRoleLoading(false); 
                }
            })();
            return () => { cancelled = true; };
        }, [event?.id, user?.id, roleProp]);

        // Listen for refresh signals if we're managing our own role
        React.useEffect(() => {
            if (roleProp != null || !event?.id) return;
            const h = (e) => {
                if (e?.detail?.eventId && e.detail.eventId !== event.id) return;
                window.RoleAPI?.getRole(event.id, { force: true }).then(setUserRole);
            };
            window.addEventListener('event:role-refreshed', h);
            window.addEventListener('event:role-updated', h);
            window.addEventListener('collaboratorUpdated', h);
            return () => {
                window.removeEventListener('event:role-refreshed', h);
                window.removeEventListener('event:role-updated', h);
                window.removeEventListener('collaboratorUpdated', h);
            };
        }, [event?.id, roleProp]);

        // unchanged: permissions
        const canManageCollaborators = derivedIsOwner;
        const canViewBudgetLocal = (userRole === 'admin' || userRole === 'editor'); // owners counted as admin upstream

        const formatDate = (dateString) => {
            // Use the centralized formatLongDate function for consistent formatting
            return window.formatLongDate ? window.formatLongDate(dateString) : (dateString || 'Not set');
        };

        const formatTime = (timeString) => {
            // Use the centralized normalizeTime12h function for consistent formatting
            return window.normalizeTime12h ? window.normalizeTime12h(timeString) : (timeString || 'Not set');
        };

        const formatDateRange = () => {
            const startDate = formatDate(event.start_date);
            const endDate = formatDate(event.end_date);
            
            if (startDate === endDate || endDate === 'Not set') {
                return startDate;
            }
            return `${startDate} - ${endDate}`;
        };

        const getVendorCategoryDisplay = (categoryName) => {
            // Search through all VENDOR_CATEGORIES groups to find the category by name
            const categories = window.VENDOR_CATEGORIES || {};
            
            for (const groupName in categories) {
                const group = categories[groupName];
                const foundCategory = group.find(item => item.name === categoryName);
                if (foundCategory) {
                    return foundCategory;
                }
            }
            
            // Fallback if not found
            return { name: categoryName, icon: '🔧' };
        };



        // Load collaborators when component mounts
        const loadCollaborators = async () => {
            try {
                if (!window.collaboratorAPI || !event?.id) {
                    setCollaborators([]);
                    return;
                }
                
                const session = await window.getSessionWithRetry?.(3, 150);
                if (!session?.user) {
                    setCollaborators([]);
                    return;
                }
                
                // Ensure event owner role exists first
                await window.collaboratorAPI.ensureEventOwnerRole(event.id);
                
                const data = await window.collaboratorAPI.getCollaborators(event.id);
                setCollaborators(data || []);
            } catch (error) {
                const errorMsg = error?.message || 'Unknown error occurred';
                setCollaborators([]);
                // Don't show toast for routine loading errors
            }
        };

        // Load collaborators when event changes - single useEffect with eventId dependency only
        React.useEffect(() => {
            if (event?.id) {
                loadCollaborators();
            }
        }, [event?.id]);

        // Listen for collaborator updates - DO NOT reload on visibility change
        React.useEffect(() => {
            const handleCollaboratorUpdate = (e) => {
                if (e.detail?.eventId === event?.id) {
                    loadCollaborators();
                }
            };

            window.addEventListener('collaboratorUpdated', handleCollaboratorUpdate);
            
            return () => {
                window.removeEventListener('collaboratorUpdated', handleCollaboratorUpdate);
            };
        }, [event?.id]);

        return (
            <div className="space-y-6" data-name="event-detail-sidebar" data-file="components/Events/ViewEventDetailSidebar.js">
                {/* Event Info Section */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <i className="fas fa-info-circle mr-2 text-blue-600"></i>
                        Event Details
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div>
                            <span className="text-gray-600">Location:</span>
                            <p className="font-medium">{event.location || 'Not specified'}</p>
                        </div>
                        <div>
                            <span className="text-gray-600">Expected Guests:</span>
                            <p className="font-medium">{event.expected_attendance ?? 'Not specified'}</p>
                        </div>
                        <div>
                            <span className="text-gray-600">Support Staff Needed:</span>
                            <p className="font-medium">{event.support_staff_needed ?? 'Not specified'}</p>
                        </div>
                        <div>
                            <span className="text-gray-600">Event Type:</span>
                            <p className="font-medium">{event.event_type || 'Not specified'}</p>
                        </div>
                    </div>
                </div>



                {/* Collaborators Section */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <div className="icon-users text-lg text-indigo-600 mr-2"></div>
                        Collaborators
                    </h3>
                    {canManageCollaborators && (
                        <button
                            onClick={() => setShowCollaboratorManagement(true)}
                            className="text-sm bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 transition-colors"
                        >
                            Manage
                        </button>
                    )}
                </div>

                    {showCollaboratorManagement && window.CollaboratorManagement && (
                        React.createElement(window.CollaboratorManagement, {
                            eventId: event.id,
                            onClose: () => setShowCollaboratorManagement(false),
                            canManageCollaborators: canManageCollaborators,
                            permissionsReady: true
                        })
                    )}

                    {/* Show current collaborators */}
                    {!showCollaboratorManagement && (
                        <div>
                            {collaborators.length === 0 ? (
                                <div className="text-sm text-gray-500">No collaborators yet</div>
                            ) : (
                                        <div className="space-y-2">
                                            {collaborators.slice(0, 3).map((collaborator, index) => (
                                                <div key={collaborator.id || collaborator.user_id || collaborator.email || `collaborator-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                                                    <span className="text-gray-900">
                                                        {collaborator.displayName || collaborator.email || 'Unknown User'}
                                                    </span>
                                                    <span className="text-xs text-gray-500 capitalize">
                                                        {collaborator.role === 'admin' ? 'Owner' : collaborator.role}
                                                    </span>
                                                </div>
                                            ))}
                                            {collaborators.length > 3 && (
                                                <div className="text-xs text-gray-500">
                                                    +{collaborators.length - 3} more
                                                </div>
                                            )}
                                        </div>
                            )}
                        </div>
                    )}
                </div>




                {/* Budget moved to main ViewEventDetailContent to avoid duplicate cards */}

                {/* Vendor Types Needed Section */}
                {event.vendor_categories && event.vendor_categories.length > 0 && (
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                            <i className="fas fa-users mr-2 text-purple-600"></i>
                            Vendor types needed:
                        </h3>
                        <div className="space-y-2">
                            {event.vendor_categories.map((category, index) => {
                                const categoryInfo = getVendorCategoryDisplay(category);
                                return (
                                    <div key={index} className="flex items-center space-x-2 text-sm">
                                        <span className="text-lg">{categoryInfo.icon}</span>
                                        <span className="font-medium text-gray-900">{categoryInfo.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}


            </div>
        );
    } catch (error) {
        return null;
    }
}

window.ViewEventDetailSidebar = ViewEventDetailSidebar;
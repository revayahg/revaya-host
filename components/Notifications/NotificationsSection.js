// Notifications Section Component
function NotificationsSection() {
    try {
        const [notifications, setNotifications] = React.useState([]);
        const [loading, setLoading] = React.useState(true);
        const [unreadCount, setUnreadCount] = React.useState(0);
        const [currentPage, setCurrentPage] = React.useState(1);
        const [totalNotifications, setTotalNotifications] = React.useState(0);
        const notificationsPerPage = 10;
        
        // Safe context access with fallback
        const authContext = React.useContext(window.AuthContext) || {};
        const { user } = authContext;

        const subscriptionRef = React.useRef(null);

        React.useEffect(() => {
            try {
                if (user) {
                    // Small delay to ensure any pending database operations are completed
                    setTimeout(() => {
                        loadNotifications();
                        loadUnreadCount();
                    }, 100);
                    setupRealtimeSubscription();
                    
                    // Listen for notification creation events
                    const handleNotificationCreated = (event) => {
                        if (event.detail?.notification?.user_id === user.id) {
                            // Reload current page to maintain pagination
                            loadNotifications(currentPage);
                            setUnreadCount(prev => prev + 1);
                        }
                    };

                    // Listen for task assignment events specifically
                    const handleTaskAssigned = (event) => {
                        // Reload notifications to catch any new task notifications
                        setTimeout(() => {
                            loadNotifications(currentPage);
                            loadUnreadCount();
                        }, 1000);
                    };
                    
                    // Listen for message sent events
                    const handleMessageSent = (event) => {
                        // Reload notifications to catch any new message notifications
                        setTimeout(() => {
                            loadNotifications(currentPage);
                            loadUnreadCount();
                        }, 1000);
                    };
                    
                    // Listen for collaborator invitation events
                    const handleCollaboratorInvited = (event) => {
                        // Reload notifications to catch any new collaborator invitation notifications
                        setTimeout(() => {
                            loadNotifications(currentPage);
                            loadUnreadCount();
                        }, 1000);
                    };
                    
                    // Listen for notification read events (when invitations are declined)
                    const handleNotificationRead = (event) => {
                        // Reload notifications to remove declined invitations - give database time to process deletion
                        setTimeout(() => {
                            loadNotifications(currentPage);
                            loadUnreadCount();
                        }, 3000);
                    };
                    
                    window.addEventListener('notificationCreated', handleNotificationCreated);
                    window.addEventListener('taskAssigned', handleTaskAssigned);
                    window.addEventListener('messageSent', handleMessageSent);
                    window.addEventListener('collaboratorInvited', handleCollaboratorInvited);
                    window.addEventListener('notificationRead', handleNotificationRead);
                    
                    return () => {
                        window.removeEventListener('notificationCreated', handleNotificationCreated);
                        window.removeEventListener('taskAssigned', handleTaskAssigned);
                        window.removeEventListener('messageSent', handleMessageSent);
                        window.removeEventListener('collaboratorInvited', handleCollaboratorInvited);
                        window.removeEventListener('notificationRead', handleNotificationRead);
                        if (subscriptionRef.current) {
                            subscriptionRef.current.unsubscribe();
                        }
                    };
                }
            } catch (error) {
            }
        }, [user]);

        const setupRealtimeSubscription = () => {
            try {
                if (!user?.id) return;

                if (subscriptionRef.current) {
                    subscriptionRef.current.unsubscribe();
                }

                subscriptionRef.current = window.supabaseClient
                    .channel('notifications_' + user.id)
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'notifications',
                            filter: `user_id=eq.${user.id}`
                        },
                        (payload) => {
                            try {
                                // Reload current page to maintain pagination
                                loadNotifications(currentPage);
                                setUnreadCount(prev => prev + 1);
                            } catch (error) {
                            }
                        }
                    )
                    .subscribe();
            } catch (error) {
            }
        };

        const loadNotifications = async (page = 1) => {
            try {
                if (!user?.id) {
                    setLoading(false);
                    return;
                }
                
                setLoading(true);
                
                // Calculate offset for pagination
                const from = (page - 1) * notificationsPerPage;
                const to = from + notificationsPerPage - 1;
                
                // Get regular notifications
                const { data: notifications, error: notificationsError } = await window.supabaseClient
                    .from('notifications')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (notificationsError) {
                    console.error('Error loading notifications:', notificationsError);
                }

                // Get pending collaborator invitations
                const { data: pendingInvitations, error: invitationsError } = await window.supabaseClient
                    .from('event_collaborator_invitations')
                    .select(`
                        id,
                        event_id,
                        email,
                        role,
                        created_at,
                        invitation_token,
                        status,
                        read_status,
                        events!inner(
                            id,
                            name,
                            created_by
                        )
                    `)
                    .eq('email', user.email)
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false });

                console.log('🔍 NotificationsSection: Pending invitations query result:', pendingInvitations?.length || 0, pendingInvitations);

                // Clean up orphaned collaborator invitation notifications
                // (notifications that reference invitations that no longer exist)
                if (notifications && notifications.length > 0) {
                    const collaboratorNotifications = notifications.filter(n => n.type === 'collaborator_invitation');
                    if (collaboratorNotifications.length > 0) {
                        const validTokens = new Set(pendingInvitations?.map(inv => inv.invitation_token) || []);
                        const orphanedNotifications = collaboratorNotifications.filter(notif => {
                            const token = notif.metadata?.invitation_token;
                            return token && !validTokens.has(token);
                        });

                        if (orphanedNotifications.length > 0) {
                            console.log('🧹 Cleaning up orphaned collaborator invitation notifications:', orphanedNotifications.length);
                            const orphanedIds = orphanedNotifications.map(n => n.id);
                            
                            // Mark orphaned notifications as read
                            const { error: cleanupError } = await window.supabaseClient
                                .from('notifications')
                                .update({ read_status: true })
                                .in('id', orphanedIds);

                            if (cleanupError) {
                                console.error('❌ Failed to cleanup orphaned notifications:', cleanupError);
                            } else {
                                console.log('✅ Cleaned up orphaned notifications');
                                // Remove orphaned notifications from the local list
                                notifications = notifications.filter(n => !orphanedIds.includes(n.id));
                            }
                        }
                    }
                }

                if (invitationsError) {
                    console.error('Error loading pending invitations:', invitationsError);
                }

                // Convert pending invitations to notification-like objects
                const invitationNotifications = (pendingInvitations || []).map(invitation => {
                    console.log('🔍 NotificationsSection: Converting invitation to notification:', {
                        id: invitation.id,
                        token: invitation.invitation_token,
                        status: invitation.status,
                        email: invitation.email,
                        event_id: invitation.event_id,
                        event_name: invitation.events.name
                    });
                    console.log('🔍 NotificationsSection: Full invitation object:', invitation);
                    
                    return {
                        id: `collaborator_invitation_${invitation.id}`,
                        type: 'collaborator_invitation',
                        title: '🤝 Collaboration Invitation',
                        message: `You've been invited to collaborate on "${invitation.events.name}"`,
                        event_id: invitation.event_id,
                        read_status: invitation.read_status || false, // Use database read_status
                        created_at: invitation.created_at,
                        metadata: {
                            invitation_token: invitation.invitation_token,
                            role: invitation.role,
                            invitation_id: invitation.id,
                            event_name: invitation.events.name
                        }
                    };
                });

                // Combine and sort all notifications by created_at
                const allNotifications = [...(notifications || []), ...invitationNotifications]
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                // Apply pagination
                const paginatedNotifications = allNotifications.slice(from, to + 1);

                // Update total count
                setTotalNotifications(allNotifications.length);

                console.log('📋 Loaded notifications:', notifications?.length || 0, 'regular +', invitationNotifications.length, 'invitations =', allNotifications.length, 'total');
                
                setNotifications(paginatedNotifications);
                setCurrentPage(page);
            } catch (error) {
                console.error('Error in loadNotifications:', error);
                setNotifications([]);
            } finally {
                setLoading(false);
            }
        };

        const loadUnreadCount = async () => {
            try {
                if (!user?.id) {
                    return;
                }
                
                // Get unread notifications count
                const { count: unreadCount, error: notificationsError } = await window.supabaseClient
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('read_status', false);

                if (notificationsError) {
                    console.error('Error getting unread notifications count:', notificationsError);
                }

                // Get unread collaborator invitations count
                const { count: unreadInvitationsCount, error: invitationsError } = await window.supabaseClient
                    .from('event_collaborator_invitations')
                    .select('*', { count: 'exact', head: true })
                    .eq('email', user.email)
                    .eq('status', 'pending')
                    .eq('read_status', false);

                if (invitationsError) {
                    console.error('Error getting pending invitations count:', invitationsError);
                }

                // Calculate total unread count
                const totalUnread = (unreadCount || 0) + (unreadInvitationsCount || 0);
                setUnreadCount(totalUnread);
            } catch (error) {
                console.error('Error in loadUnreadCount:', error);
                setUnreadCount(0);
            }
        };

    // Pagination helper functions
    const getTotalPages = () => Math.ceil(totalNotifications / notificationsPerPage);
    
    const handlePageChange = (page) => {
        if (page >= 1 && page <= getTotalPages()) {
            loadNotifications(page);
            // Smooth scroll to top of notifications section
            const notificationsSection = document.querySelector('[data-name="notifications-section"]');
            if (notificationsSection) {
                notificationsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };

    const handleMarkAsRead = async (notificationId) => {
        try {
            // Check if this is a virtual collaborator invitation notification
            if (notificationId.startsWith('collaborator_invitation_')) {
                // Extract the invitation ID from the notification ID
                const invitationId = notificationId.replace('collaborator_invitation_', '');
                
                // Update the read_status in the event_collaborator_invitations table
                const { error } = await window.supabaseClient
                    .from('event_collaborator_invitations')
                    .update({ read_status: true })
                    .eq('id', invitationId);

                if (error) throw error;

                // Update local state
                setNotifications(prev => prev.map(notif => 
                    notif.id === notificationId 
                        ? { ...notif, read_status: true }
                        : notif
                ));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } else {
                // Update regular notification in database
                const { error } = await window.supabaseClient
                    .from('notifications')
                    .update({ read_status: true })
                    .eq('id', notificationId);

                if (error) throw error;

                // Update local state
                setNotifications(prev => prev.map(notif => 
                    notif.id === notificationId 
                        ? { ...notif, read_status: true }
                        : notif
                ));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }

            // Dispatch event for dashboard counter update
            // NotificationsSection: Dispatching notificationRead event
            window.dispatchEvent(new CustomEvent('notificationRead'));
        } catch (error) {
            if (window.showToast) {
                window.showToast('Failed to mark notification as read', 'error');
            }
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            // Mark all regular notifications as read in database
            const { error: notificationsError } = await window.supabaseClient
                .from('notifications')
                .update({ read_status: true })
                .eq('user_id', user.id)
                .eq('read_status', false);

            if (notificationsError) throw notificationsError;

            // Mark all unread collaborator invitation notifications as read in database
            const { error: invitationsError } = await window.supabaseClient
                .from('event_collaborator_invitations')
                .update({ read_status: true })
                .eq('email', user.email)
                .eq('status', 'pending')
                .eq('read_status', false);

            if (invitationsError) throw invitationsError;

            // Reload current page to maintain pagination
            loadNotifications(currentPage);
            setUnreadCount(0);

            // Dispatch event for dashboard counter update
            window.dispatchEvent(new CustomEvent('notificationRead'));

            if (window.showToast) {
                window.showToast('All notifications marked as read', 'success');
            }
        } catch (error) {
            if (window.showToast) {
                window.showToast('Failed to mark all notifications as read', 'error');
            }
        }
    };

    const handleNotificationAction = async (notification) => {
        try {
            // Mark as read first
            if (!notification.read_status) {
                await handleMarkAsRead(notification.id);
            }
            
            // Navigate based on notification type
            const data = notification.metadata || notification.data || {};
            
            switch (notification.type) {
                case 'message':
                    if (notification.event_id) {
                        // Navigate to view page first
                        window.location.hash = `#/event/view/${notification.event_id}`;
                        // Use setTimeout to ensure the page loads before setting the tab
                        setTimeout(() => {
                            // Try to find and click the messages tab or scroll to messages section
                            const messagesSection = document.querySelector('[data-name="messages-section"], [data-section="messages"]');
                            if (messagesSection) {
                                messagesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            } else {
                                // Fallback: try to dispatch a custom event for tab change
                                window.dispatchEvent(new CustomEvent('scrollToSection', { 
                                    detail: { section: 'messages' } 
                                }));
                            }
                        }, 500);
                    }
                    break;
                case 'task':
                case 'task_assigned':
                case 'task_assignment':
                case 'task_updated':
                case 'task_completed':
                    if (notification.event_id) {
                        // Navigate to edit page with tasks tab using the same pattern as Tasks button
                        window.location.hash = `#/event/edit/${notification.event_id}`;
                        // Use setTimeout to ensure the page loads before setting the tab
                        setTimeout(() => {
                            const url = new URL(window.location);
                            url.searchParams.set('tab', 'tasks');
                            window.history.pushState({}, '', url.toString());
                            // Force tab change by dispatching a custom event
                            window.dispatchEvent(new Event('tabchange'));
                        }, 100);
                    }
                    break;
                case 'invitation':
                    if (data.invite_url) {
                        window.location.href = data.invite_url;
                    }
                    break;
                case 'collaborator_invitation':
                    // Navigate to collaborator invitation response page
                    if (data.invitation_token) {
                        window.location.hash = `#/collaborator-invite-response?token=${data.invitation_token}`;
                    } else if (notification.event_id) {
                        // Fallback to event page if no token
                        window.location.hash = `#/event/view/${notification.event_id}`;
                    }
                    break;
                case 'invitation_response':
                case 'event_update':
                    if (notification.event_id || data.event_id) {
                        const eventId = notification.event_id || data.event_id;
                        window.location.hash = `#/event/edit/${eventId}`;
                    }
                    break;
            }
        } catch (error) {
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'message': return 'message-circle';
            case 'invitation': return 'mail';
            case 'collaborator_invitation': return 'users';
            case 'task': 
            case 'task_assigned': 
            case 'task_assignment': return 'clipboard-check';
            case 'task_updated': return 'check-circle';
            case 'task_completed': return 'check';
            case 'event_update': return 'calendar';
            case 'vendor_update': return 'users';
            case 'system': return 'bell';
            default: return 'bell';
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            return 'Just now';
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)} hours ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    const formatTaskTimestamp = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / 60000);

        if (diffInMinutes < 1) return 'just now';
        if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} hours ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays} days ago`;
        
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex justify-center items-center h-64">
                    <window.LoadingSpinner />
                </div>
            </div>
        );
    }

    return (
        <div className="p-6" data-name="notifications-section" data-file="components/Notifications/NotificationsSection.js">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                    <div className="flex items-center space-x-4 mt-1">
                        {unreadCount > 0 && (
                            <p className="text-sm text-gray-600">
                                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                            </p>
                        )}
                        {totalNotifications > 0 && (
                            <p className="text-sm text-gray-500">
                                Showing {((currentPage - 1) * notificationsPerPage) + 1}-{Math.min(currentPage * notificationsPerPage, totalNotifications)} of {totalNotifications} notifications
                            </p>
                        )}
                    </div>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllAsRead}
                        className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        Mark All as Read
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="text-center py-12">
                    <div className="icon-bell text-4xl text-gray-400 mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
                    <p className="text-gray-600">You'll see notifications here when you have updates.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                                notification.read_status
                                    ? 'bg-white border-gray-200'
                                    : 'bg-blue-50 border-blue-200'
                            }`}
                            onClick={() => !notification.read_status && handleMarkAsRead(notification.id)}
                        >
                            <div className="flex items-start space-x-3">
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                    notification.read_status ? 'bg-gray-100' : 'bg-blue-100'
                                }`}>
                                    <div className={`icon-${getNotificationIcon(notification.type)} text-sm ${
                                        notification.read_status ? 'text-gray-600' : 'text-blue-600'
                                    }`}></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h4 className={`font-medium ${
                                            notification.read_status ? 'text-gray-900' : 'text-blue-900'
                                        }`}>
                                            {notification.title}
                                        </h4>
                                        <span className="text-sm text-gray-500">
                                            {formatDate(notification.created_at)}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 text-sm mt-1">
                                        {notification.message}
                                    </p>
                                    {notification.events && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            Event: {notification.events.name}
                                        </p>
                                    )}
                                    {(notification.type === 'task' || notification.type === 'task_assigned' || notification.type === 'task_assignment' || notification.type === 'task_updated' || notification.type === 'task_completed') && (
                                        <div className="flex items-center mt-2 text-xs text-gray-400">
                                            <div className="icon-clock text-xs mr-1"></div>
                                            <span title={new Date(notification.created_at).toLocaleString()}>
                                                Assigned {formatTaskTimestamp(notification.created_at)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center space-x-2 mt-3">
                                        <button
                                            onClick={() => handleNotificationAction(notification)}
                                            className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 transition-colors"
                                        >
                                            View
                                        </button>
                                        {!notification.read_status && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMarkAsRead(notification.id);
                                                }}
                                                className="text-xs text-indigo-600 hover:text-indigo-800"
                                            >
                                                Mark as read
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {!notification.read_status && (
                                    <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {totalNotifications > notificationsPerPage && (
                <div className="mt-8 flex items-center justify-center space-x-2">
                    {/* Previous Button */}
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            currentPage === 1
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        <div className="flex items-center">
                            <div className="icon-chevron-left text-sm mr-1"></div>
                            Previous
                        </div>
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                        {(() => {
                            const totalPages = getTotalPages();
                            const pages = [];
                            const maxVisiblePages = 5;
                            
                            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                            
                            // Adjust start if we're near the end
                            if (endPage - startPage < maxVisiblePages - 1) {
                                startPage = Math.max(1, endPage - maxVisiblePages + 1);
                            }
                            
                            // Add first page and ellipsis if needed
                            if (startPage > 1) {
                                pages.push(
                                    <button
                                        key={1}
                                        onClick={() => handlePageChange(1)}
                                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        1
                                    </button>
                                );
                                if (startPage > 2) {
                                    pages.push(
                                        <span key="ellipsis1" className="px-2 text-gray-500">...</span>
                                    );
                                }
                            }
                            
                            // Add visible page numbers
                            for (let i = startPage; i <= endPage; i++) {
                                pages.push(
                                    <button
                                        key={i}
                                        onClick={() => handlePageChange(i)}
                                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                            i === currentPage
                                                ? 'text-white bg-indigo-600 border border-indigo-600'
                                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        {i}
                                    </button>
                                );
                            }
                            
                            // Add last page and ellipsis if needed
                            if (endPage < totalPages) {
                                if (endPage < totalPages - 1) {
                                    pages.push(
                                        <span key="ellipsis2" className="px-2 text-gray-500">...</span>
                                    );
                                }
                                pages.push(
                                    <button
                                        key={totalPages}
                                        onClick={() => handlePageChange(totalPages)}
                                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        {totalPages}
                                    </button>
                                );
                            }
                            
                            return pages;
                        })()}
                    </div>

                    {/* Next Button */}
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === getTotalPages()}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            currentPage === getTotalPages()
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        <div className="flex items-center">
                            Next
                            <div className="icon-chevron-right text-sm ml-1"></div>
                        </div>
                    </button>
                </div>
            )}
        </div>
        );
    } catch (error) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <div className="icon-alert-circle text-4xl text-red-400 mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Notifications</h3>
                    <p className="text-gray-600">Please refresh the page to try again.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                        Refresh Page
                    </button>
                </div>
            </div>
        );
    }
}

window.NotificationsSection = NotificationsSection;

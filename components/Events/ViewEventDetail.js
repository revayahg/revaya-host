function ViewEventDetail() {
    const { user } = React.useContext(AuthContext);
    const [event, setEvent] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [tasks, setTasks] = React.useState([]);
    const [loadingTasks, setLoadingTasks] = React.useState(false);
    const [editingBudget, setEditingBudget] = React.useState(false);

    // NEW: Centralized role state
    const [userRole, setUserRole] = React.useState(null);
    const [loadingRole, setLoadingRole] = React.useState(true);

    // Extract event ID from URL
    const eventId = React.useMemo(() => {
        const hash = window.location.hash;
        const match = hash.match(/\/event\/(?:view\/)?([a-f0-9-]{36})/);
        return match ? match[1] : null;
    }, []);

    // Load event data
    React.useEffect(() => {
        if (!eventId || !user?.id) {
            setLoading(false);
            return;
        }

        const loadEvent = async () => {
            try {
                setLoading(true);
                window.Environment?.devLog('Loading event:', eventId, 'for user:', user.id);
                
                // Use centralized getEvent function which handles access control
                const eventData = await window.getEvent(eventId);
                
                setEvent(eventData || null);
                setError(eventData ? null : 'Event not found');
            } catch (err) {
                setError(err.message || 'Failed to load event');
                setEvent(null);
            } finally {
                setLoading(false);
            }
        };

        loadEvent();
    }, [eventId, user?.id]);

    // NEW: Load user role for event
    React.useEffect(() => {
        let cancelled = false;

        async function loadRole(force = false) {
            try {
                if (!eventId || !user?.id) {
                    if (!cancelled) { 
                        setUserRole(null); 
                        setLoadingRole(false); 
                    }
                    return;
                }
                setLoadingRole(true);
                const role = await window.RoleAPI?.getRole(eventId, { force }) || null;
                if (!cancelled) setUserRole(role);
            } catch (error) {
                if (!cancelled) setUserRole(null);
            } finally {
                if (!cancelled) setLoadingRole(false);
            }
        }

        loadRole(false);
        return () => { cancelled = true; };
    }, [eventId, user?.id]);

    // NEW: Listen for role change events
    React.useEffect(() => {
        if (!eventId) return;

        const handleRoleRefresh = (e) => {
            if (e?.detail?.eventId && e.detail.eventId !== eventId) return;
            
            // Force refresh role and show toast notification
            window.RoleAPI?.getRole(eventId, { force: true }).then((role) => {
                setUserRole(role);
                if (window.toast) {
                    window.toast.show('Your permissions for this event have been updated', 'info');
                }
            });
        };

        // Listen to multiple role update events
        window.addEventListener('event:role-refreshed', handleRoleRefresh);
        window.addEventListener('event:role-updated', handleRoleRefresh);
        window.addEventListener('collaboratorUpdated', handleRoleRefresh);

        return () => {
            window.removeEventListener('event:role-refreshed', handleRoleRefresh);
            window.removeEventListener('event:role-updated', handleRoleRefresh);
            window.removeEventListener('collaboratorUpdated', handleRoleRefresh);
        };
    }, [eventId]);

    // NEW: Real-time database subscription for role changes
    React.useEffect(() => {
        if (!eventId || !user?.id || !window.supabaseClient?.channel) return;
        
        const channel = window.supabaseClient
            .channel(`role-watch-${eventId}-${user.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'event_user_roles',
                filter: `event_id=eq.${eventId}`
            }, (payload) => {
                const affectedUserId = payload.new?.user_id || payload.old?.user_id;
                if (affectedUserId === user.id) {
                    window.RoleAPI?.forceRefresh(eventId).then((role) => {
                        setUserRole(role);
                        window.dispatchEvent(new CustomEvent('event:role-refreshed', { 
                            detail: { eventId, userId: user.id } 
                        }));
                    });
                }
            })
            .subscribe();

        return () => { 
            try { 
                window.supabaseClient.removeChannel(channel); 
            } catch (error) {
            } 
        };
    }, [eventId, user?.id]);

    // Load tasks
    React.useEffect(() => {
        if (!eventId) return;

        const loadTasks = async () => {
            try {
                setLoadingTasks(true);
                const tasksData = await window.taskAPI.getTasks(eventId);
                setTasks(tasksData || []);
            } catch (err) {
                setTasks([]);
            } finally {
                setLoadingTasks(false);
            }
        };

        loadTasks();
    }, [eventId]);

    // Helper functions
    const handleTasksChange = React.useCallback(() => {
        if (!eventId) return;
        
        const loadTasks = async () => {
            try {
                const tasksData = await window.taskAPI.getTasks(eventId);
                setTasks(tasksData || []);
            } catch (err) {
            }
        };
        loadTasks();
    }, [eventId]);

    const handleEventChange = React.useCallback((updatedEvent) => {
        setEvent(updatedEvent);
    }, []);

    // Helper functions for budget calculations
    const getCurrentTotals = React.useCallback(() => {
        if (!event?.budget_items) return { allocated: 0, spent: 0, remaining: 0 };
        
        try {
            const items = typeof event.budget_items === 'string' 
                ? JSON.parse(event.budget_items) 
                : event.budget_items;
            
            if (!Array.isArray(items)) return { allocated: 0, spent: 0, remaining: 0 };
            
            const allocated = items.reduce((sum, item) => sum + (parseFloat(item.allocated) || 0), 0);
            const spent = items.reduce((sum, item) => sum + (parseFloat(item.spent) || 0), 0);
            const remaining = allocated - spent;
            
            return { allocated, spent, remaining };
        } catch (error) {
            return { allocated: 0, spent: 0, remaining: 0 };
        }
    }, [event?.budget_items]);

    const calculateDaysToGo = React.useCallback((dateStr) => {
        if (!dateStr) return 'No date set';
        
        const eventDate = new Date(dateStr);
        const today = new Date();
        const diffTime = eventDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'Event passed';
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        return `${diffDays} days to go`;
    }, []);

    // Budget management functions
    const handleEditBudget = () => setEditingBudget(true);
    
    const handleSaveBudget = async (budgetData) => {
        try {
            await window.budgetAPI.saveBudgetItems(eventId, budgetData);
            setEditingBudget(false);
            const updatedEvent = await window.api.getEvent(eventId);
            handleEventChange(updatedEvent);
        } catch (error) {
            console.error('Error saving budget:', error);
        }
    };
    
    const handleCancelBudget = () => setEditingBudget(false);
    
    const handleTotalsChange = React.useCallback(() => {
        // Budget totals change handler - refresh event data
        if (eventId) {
        }
    }, [eventId, handleEventChange]);

    // Render loading state
    if (loading) {
        return React.createElement('div', { 
            className: 'flex justify-center items-center min-h-screen' 
        }, React.createElement('div', { 
            className: 'animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500' 
        }));
    }

    // Render error states
    if (!eventId || error || !event) {
        const errorMessage = !eventId 
            ? 'Invalid Event URL' 
            : error || 'Event Not Found';
        
        return React.createElement('div', { 
            className: 'min-h-screen bg-gray-50 flex items-center justify-center' 
        }, React.createElement('div', { 
            className: 'text-center p-8 bg-white rounded-lg shadow-md max-w-md mx-auto' 
        }, [
            React.createElement('h2', { 
                key: 'title',
                className: 'text-xl font-bold text-gray-800 mb-4' 
            }, errorMessage),
            React.createElement('a', { 
                key: 'link',
                href: '#/dashboard',
                className: 'bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700'
            }, 'Go to Dashboard')
        ]));
    }

    // Derive ownership and permissions
    const isOwner = event?.user_id === user?.id || event?.created_by === user?.id;
    const canViewBudget = isOwner || userRole === 'admin' || userRole === 'editor';

    // Render event content
    return React.createElement('div', { 
        className: 'min-h-screen bg-gray-50 pb-4 sm:pb-8' 
    }, React.createElement('div', {
        className: 'container mx-auto px-4 sm:px-6 lg:px-8'
    }, React.createElement(ViewEventDetailContent, {
        event,
        eventId,
        tasks,
        loadingTasks,
        onTasksChange: handleTasksChange,
        onEventChange: handleEventChange,
        editingBudget,
        getCurrentTotals,
        calculateDaysToGo,
        handleEditBudget,
        handleSaveBudget,
        handleCancelBudget,
        handleTotalsChange,
        eventDates: [],
        userRole,           // Pass real role state
        loadingRole,        // Pass loading state
        isOwner,           // Pass derived ownership
        canViewBudget      // Pass derived budget permission
    })));
}

window.ViewEventDetail = ViewEventDetail;
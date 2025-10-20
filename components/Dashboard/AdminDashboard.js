function AdminDashboard() {
    try {
        const [events, setEvents] = React.useState([]);
        const [selectedEventId, setSelectedEventId] = React.useState(null);
        const [showManageVendors, setShowManageVendors] = React.useState(false);
        const [viewMode, setViewMode] = React.useState('admin'); // 'admin' or 'vendor'
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
            if (authUser) {
                fetchEvents();
            }
        }, [authUser]);

        React.useEffect(() => {
            const handleHashChange = () => {
                if (window.location.hash === '#/dashboard' && authUser) {
                    fetchEvents();
                }
            };

            window.addEventListener('hashchange', handleHashChange);
            return () => window.removeEventListener('hashchange', handleHashChange);
        }, [authUser]);

        const fetchEvents = async () => {
            if (!authUser) return;

            try {
                setLoading(true);
                
                // Fetch events with proper error handling
                const { data, error } = await window.supabaseClient
                    .from('events')
                    .select('*')
                    .eq('user_id', authUser.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                
                setEvents(data || []);
            } catch (error) {
                window.toast?.error('Failed to load events');
            } finally {
                setLoading(false);
            }
        };

        const handleManageVendors = (eventId) => {
            setSelectedEventId(eventId);
            setShowManageVendors(true);
        };

        const handleCloseModal = () => {
            setShowManageVendors(false);
            setSelectedEventId(null);
        };

        const authContext = React.useContext(window.AuthContext || React.createContext({}));
        const { user: authUser, loading: authLoading, authInitialized } = authContext;

        if (authLoading || !authInitialized) {
            return React.createElement('div', {
                className: 'min-h-screen flex items-center justify-center'
            }, React.createElement('div', {
                className: 'text-center'
            }, [
                React.createElement('div', {
                    key: 'spinner',
                    className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4'
                }),
                React.createElement('p', {
                    key: 'text',
                    className: 'text-gray-600'
                }, 'Loading authentication...')
            ]));
        }

        if (!authUser) {
            return React.createElement('div', {
                className: 'min-h-screen flex items-center justify-center bg-gray-50'
            }, React.createElement('div', {
                className: 'text-center max-w-md mx-auto p-6'
            }, [
                React.createElement('div', {
                    key: 'icon',
                    className: 'w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4'
                }, React.createElement('div', {
                    className: 'icon-lock text-2xl text-indigo-600'
                })),
                React.createElement('h2', {
                    key: 'title',
                    className: 'text-xl font-semibold text-gray-900 mb-2'
                }, 'Authentication Required'),
                React.createElement('p', {
                    key: 'description',
                    className: 'text-gray-600 mb-6'
                }, 'Please sign in to access the dashboard.'),
                React.createElement('button', {
                    key: 'login-btn',
                    onClick: () => {
                        sessionStorage.setItem('postLoginReturn', window.location.hash);
                        window.location.hash = '#/login';
                    },
                    className: 'inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors'
                }, 'Sign In')
            ]));
        }

        if (loading) {
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <i className="fas fa-spinner fa-spin text-4xl text-indigo-600 mb-4"></i>
                        <p className="text-gray-600">Loading dashboard...</p>
                    </div>
                </div>
            );
        }

        return (
            <div data-name="admin-dashboard" className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
                    <p className="text-gray-600">Manage events and vendor assignments</p>
                </div>

                <div className="flex gap-4 mt-4 mb-6">
                    <button
                        onClick={() => setViewMode('admin')}
                        className={`px-4 py-2 text-sm font-medium rounded ${
                            viewMode === 'admin' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'
                        }`}
                        data-name="admin-view-tab"
                    >
                        Admin View
                    </button>
                    <button
                        onClick={() => setViewMode('vendor')}
                        className={`px-4 py-2 text-sm font-medium rounded ${
                            viewMode === 'vendor' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'
                        }`}
                        data-name="vendor-view-tab"
                    >
                        Vendor View
                    </button>
                </div>

                {viewMode === 'admin' ? (
                    events.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                            <div className="text-gray-400 mb-4">
                                <i className="fas fa-calendar-times text-5xl"></i>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No Events Found</h3>
                            <p className="mt-1 text-gray-500">Create your first event to get started</p>
                            <div className="mt-6">
                                <button
                                    onClick={() => window.location.hash = '#/event/create'}
                                    className="px-3 py-2 sm:px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm sm:text-base flex items-center justify-center"
                                    data-name="create-event-button"
                                >
                                    <i className="fas fa-plus mr-2"></i>
                                    Create New Event
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {events.map((event) => (
                                <div 
                                    key={event.id}
                                    className="bg-white rounded-lg shadow-sm p-6 border"
                                    data-name="event-card"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold mb-1" data-name="event-title">
                                                {event.title || event.name}
                                            </h3>
                                            <p className="text-sm text-gray-600" data-name="event-date">
                                                {new Date(event.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span 
                                            className={`px-2 py-1 text-xs rounded ${
                                                event.status === 'active' 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}
                                            data-name="event-status"
                                        >
                                            {event.status}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-sm text-gray-600" data-name="event-location">
                                            <i className="fas fa-map-marker-alt mr-2"></i>
                                            {event.location}
                                        </p>
                                        <p className="text-sm text-gray-600" data-name="event-attendees">
                                            <i className="fas fa-users mr-2"></i>
                                            {event.attendance || 0} Attendees
                                        </p>
                                    </div>

                                    <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                                        <button
                                            onClick={() => window.location.hash = `#/event/${event.id}`}
                                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                            data-name="view-details-button"
                                        >
                                            View Details
                                        </button>
                                        <button 
                                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                                            onClick={() => handleManageVendors(event.id)}
                                            data-name="manage-vendors-button"
                                        >
                                            Manage Vendors
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    window.VendorDashboard ? (
                        <window.VendorDashboard />
                    ) : (
                        <div className="bg-white p-6 rounded shadow text-center text-gray-600">
                            VendorDashboard component not loaded
                        </div>
                    )
                )}

                {showManageVendors && selectedEventId && window.ManageEventVendors && (
                    <window.ManageEventVendors 
                        eventId={selectedEventId}
                        onClose={handleCloseModal}
                    />
                )}
            </div>
        );
    } catch (error) {
        reportError(error);
        return (
            <div className="text-center py-12">
                <div className="text-red-600 mb-4">
                    <i className="fas fa-exclamation-triangle text-5xl"></i>
                </div>
                <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
                <p className="text-gray-600">Unable to load admin dashboard</p>
            </div>
        );
    }
}

// Register component globally
window.AdminDashboard = AdminDashboard;

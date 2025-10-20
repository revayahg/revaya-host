// CollaborativeEventsSection - Updated 2025-01-04 - Fixed to use end_date for past/upcoming logic with sorting and past events styling
function CollaborativeEventsSection() {
    try {
        const [collaborativeEvents, setCollaborativeEvents] = React.useState([]);
        const [loading, setLoading] = React.useState(true);
        const context = React.useContext(window.AuthContext || React.createContext({}));
        const { user } = context;

        const loadCollaborativeEvents = React.useCallback(async () => {
            if (!user) {
                setCollaborativeEvents([]);
                setLoading(false);
                return;
            }
            
            try {
                
                setLoading(true);
                
                // Check if collaboratorAPI exists and has the method
                if (!window.collaboratorAPI || !window.collaboratorAPI.getCollaborativeEvents) {
                    setCollaborativeEvents([]);
                    return;
                }
                
                const events = await window.collaboratorAPI.getCollaborativeEvents();
                
                setCollaborativeEvents(events || []);
                
            } catch (error) {
                setCollaborativeEvents([]);
            } finally {
                setLoading(false);
            }
        }, [user]);

        React.useEffect(() => {
            loadCollaborativeEvents();
        }, [loadCollaborativeEvents]);

        // Listen for updates
        React.useEffect(() => {
            const handleUpdate = () => {
                loadCollaborativeEvents();
            };

            window.addEventListener('eventsUpdated', handleUpdate);
            window.addEventListener('collaboratorUpdated', handleUpdate);
            window.addEventListener('dashboardRefresh', handleUpdate);
            
            return () => {
                window.removeEventListener('eventsUpdated', handleUpdate);
                window.removeEventListener('collaboratorUpdated', handleUpdate);
                window.removeEventListener('dashboardRefresh', handleUpdate);
            };
        }, [loadCollaborativeEvents]);

        if (loading) {
            return React.createElement('div', {
                className: 'space-y-6'
            }, [
                React.createElement('h2', {
                    key: 'title',
                    className: 'text-xl font-semibold text-gray-900'
                }, 'Events I\'m Collaborating On'),
                React.createElement('div', {
                    key: 'loading',
                    className: 'text-center py-8'
                }, 'Loading collaborative events...')
            ]);
        }

        if (!collaborativeEvents.length) {
            return React.createElement('div', {
                className: 'space-y-6'
            }, [
                React.createElement('h2', {
                    key: 'title',
                    className: 'text-xl font-semibold text-gray-900'
                }, 'Events I\'m Collaborating On'),
                React.createElement('div', {
                    key: 'empty',
                    className: 'text-center py-12'
                }, [
                    React.createElement('div', {
                        key: 'icon',
                        className: 'text-gray-400 mb-4'
                    }, React.createElement('i', { className: 'fas fa-users fa-3x' })),
                    React.createElement('h3', {
                        key: 'title',
                        className: 'text-lg font-medium text-gray-900 mb-2'
                    }, 'No collaborative events yet'),
                    React.createElement('p', {
                        key: 'desc',
                        className: 'text-gray-500'
                    }, 'You haven\'t been invited to collaborate on any events yet')
                ])
            ]);
        }

        // Sort events by date and separate upcoming vs past - use end_date for past/upcoming determination
        // Normalize current date to midnight for accurate day-only comparison
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); // Set to midnight
        
        // Helper function to get the correct event date from event_schedule or fallback to legacy fields
        const getEventDate = (event) => {
            // Try to get date from event_schedule first (where actual dates are stored)
            if (event.event_schedule && Array.isArray(event.event_schedule) && event.event_schedule.length > 0) {
                const lastScheduleItem = event.event_schedule[event.event_schedule.length - 1];
                if (lastScheduleItem && lastScheduleItem.date) {
                    return lastScheduleItem.date; // Use the last date (end date) for past/upcoming determination
                }
            }
            // Fallback to legacy fields
            return event.end_date || event.start_date || event.date;
        };

        // Helper function to get the display date range for showing in event cards
        const getDisplayDate = (event) => {
            // Try to get dates from event_schedule first (where actual dates are stored)
            if (event.event_schedule && Array.isArray(event.event_schedule) && event.event_schedule.length > 0) {
                const validScheduleItems = event.event_schedule.filter(item => item && item.date);
                if (validScheduleItems.length > 0) {
                    if (validScheduleItems.length === 1) {
                        // Single date event - just return the date
                        return validScheduleItems[0].date;
                    } else {
                        // Multi-date event - return first and last dates
                        const firstDate = validScheduleItems[0].date;
                        const lastDate = validScheduleItems[validScheduleItems.length - 1].date;
                        return { firstDate, lastDate, isMultiDate: true };
                    }
                }
            }
            // Fallback to legacy fields - single date
            const fallbackDate = event.start_date || event.date || event.end_date;
            return fallbackDate;
        };
        
        const upcomingCollaborativeEvents = collaborativeEvents.filter(collab => {
            const eventDateStr = getEventDate(collab.event);
            if (!eventDateStr) return false;
            const normalizedEventDate = new Date(eventDateStr);
            normalizedEventDate.setHours(0, 0, 0, 0); // Normalize to midnight
            return normalizedEventDate >= currentDate;
        }).sort((a, b) => {
            const dateA = new Date(getEventDate(a.event));
            const dateB = new Date(getEventDate(b.event));
            return dateA - dateB; // Ascending order for upcoming events
        });

        const pastCollaborativeEvents = collaborativeEvents.filter(collab => {
            const eventDateStr = getEventDate(collab.event);
            if (!eventDateStr) return false;
            const normalizedEventDate = new Date(eventDateStr);
            normalizedEventDate.setHours(0, 0, 0, 0); // Normalize to midnight
            return normalizedEventDate < currentDate;
        }).sort((a, b) => {
            const dateA = new Date(getEventDate(a.event));
            const dateB = new Date(getEventDate(b.event));
            return dateB - dateA; // Descending order for past events
        });

        return React.createElement('div', {
            className: 'space-y-8'
        }, [
            React.createElement('h2', {
                key: 'title',
                className: 'text-xl font-semibold text-gray-900'
            }, 'Events I\'m Collaborating On'),
            
            // Upcoming Events Section
            React.createElement('div', {
                key: 'upcoming-section',
                className: 'space-y-4'
            }, [
                React.createElement('h3', {
                    key: 'upcoming-title',
                    className: 'text-lg font-medium text-gray-800'
                }, `Upcoming Events I'm Collaborating On (${upcomingCollaborativeEvents.length})`),
                React.createElement('div', {
                    key: 'upcoming-grid',
                    className: 'grid gap-6'
                }, upcomingCollaborativeEvents.length > 0 ? upcomingCollaborativeEvents.map((eventData, index) => {
                    const event = eventData.event;
                    if (!event) return null;
                    
                    return React.createElement('div', {
                        key: event.id || index,
                        className: 'bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow border-l-4 border-indigo-500'
                    }, React.createElement('div', {
                        className: 'flex justify-between items-start'
                }, [
                    React.createElement('div', {
                        key: 'content',
                        className: 'flex-1'
                    }, [
                        React.createElement('div', {
                            key: 'header',
                            className: 'flex items-center mb-2'
                        }, [
                            React.createElement('a', {
                                key: 'title',
                                href: `#/event/view/${event.id}`,
                                className: 'block hover:text-indigo-600 transition-colors'
                            }, React.createElement('h3', {
                                className: 'text-lg font-medium text-gray-900'
                            }, event.name || event.title)),
                            React.createElement('span', {
                                key: 'role',
                                className: `ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    eventData.role === 'editor' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                }`
                            }, eventData.role === 'editor' ? 'Editor' : 'Viewer')
                        ]),
                        React.createElement('p', {
                            key: 'date',
                            className: 'text-sm text-gray-500'
                        }, (() => {
                            const displayData = getDisplayDate(event);
                            if (!displayData) return 'Date TBD';
                            
                            if (typeof displayData === 'object' && displayData.isMultiDate) {
                                // Multi-date event - show date range
                                const firstDateFormatted = window.formatLongDate ? window.formatLongDate(displayData.firstDate) : new Date(displayData.firstDate).toLocaleDateString();
                                const lastDateFormatted = window.formatLongDate ? window.formatLongDate(displayData.lastDate) : new Date(displayData.lastDate).toLocaleDateString();
                                return `${firstDateFormatted} - ${lastDateFormatted}`;
                            } else {
                                // Single date event
                                return window.formatLongDate ? window.formatLongDate(displayData) : new Date(displayData).toLocaleDateString();
                            }
                        })()),
                        React.createElement('p', {
                            key: 'joined',
                            className: 'text-xs text-gray-400 mt-1'
                        }, `Joined: ${new Date(eventData.joined_at).toLocaleDateString()}`)
                    ]),
                    React.createElement('div', {
                        key: 'actions',
                        className: 'flex space-x-3'
                    }, [
                        React.createElement('a', {
                            key: 'view',
                            href: `#/event/view/${event.id}`,
                            className: 'inline-flex items-center px-3 py-1.5 border border-indigo-300 text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                        }, [
                            React.createElement('i', { key: 'icon', className: 'fas fa-eye mr-2' }),
                            'View Event'
                        ])
                    ])
                ]));
            }) : [
                React.createElement('p', {
                    key: 'no-upcoming',
                    className: 'text-gray-500 text-center py-8'
                }, 'No upcoming collaborative events')
            ])
            ]),
            
            // Past Events Section
            React.createElement('div', {
                key: 'past-section',
                className: 'space-y-4'
            }, [
                React.createElement('h3', {
                    key: 'past-title',
                    className: 'text-lg font-medium text-gray-800'
                }, `Past Events I'm Collaborating On (${pastCollaborativeEvents.length})`),
                React.createElement('div', {
                    key: 'past-grid',
                    className: 'grid gap-6'
                }, pastCollaborativeEvents.length > 0 ? pastCollaborativeEvents.map((eventData, index) => {
                    const event = eventData.event;
                    if (!event) return null;
                    
                    return React.createElement('div', {
                        key: event.id || index,
                        className: 'bg-gray-50 shadow rounded-lg p-6 border-l-4 border-gray-300 opacity-75'
                    }, React.createElement('div', {
                        className: 'flex justify-between items-start'
                    }, [
                        React.createElement('div', {
                            key: 'content',
                            className: 'flex-1'
                        }, [
                            React.createElement('div', {
                                key: 'header',
                                className: 'flex items-center mb-2'
                            }, [
                                React.createElement('a', {
                                    key: 'title',
                                    href: `#/event/view/${event.id}`,
                                    className: 'block hover:text-indigo-600 transition-colors'
                                }, React.createElement('h3', {
                                    className: 'text-lg font-medium text-gray-600'
                                }, event.name || event.title)),
                                React.createElement('span', {
                                    key: 'role',
                                    className: `ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        eventData.role === 'editor' ? 'bg-gray-200 text-gray-600' : 'bg-gray-200 text-gray-600'
                                    }`
                                }, eventData.role === 'editor' ? 'Editor' : 'Viewer'),
                                React.createElement('span', {
                                    key: 'past-badge',
                                    className: 'ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600'
                                }, 'Past Event')
                            ]),
                            React.createElement('p', {
                                key: 'date',
                                className: 'text-sm text-gray-400'
                            }, (() => {
                            const displayData = getDisplayDate(event);
                            if (!displayData) return 'Date TBD';
                            
                            if (typeof displayData === 'object' && displayData.isMultiDate) {
                                // Multi-date event - show date range
                                const firstDateFormatted = window.formatLongDate ? window.formatLongDate(displayData.firstDate) : new Date(displayData.firstDate).toLocaleDateString();
                                const lastDateFormatted = window.formatLongDate ? window.formatLongDate(displayData.lastDate) : new Date(displayData.lastDate).toLocaleDateString();
                                return `${firstDateFormatted} - ${lastDateFormatted}`;
                            } else {
                                // Single date event
                                return window.formatLongDate ? window.formatLongDate(displayData) : new Date(displayData).toLocaleDateString();
                            }
                        })()),
                            React.createElement('p', {
                                key: 'joined',
                                className: 'text-xs text-gray-400 mt-1'
                            }, `Joined: ${new Date(eventData.joined_at).toLocaleDateString()}`)
                        ]),
                        React.createElement('div', {
                            key: 'actions',
                            className: 'flex space-x-3'
                        }, [
                            React.createElement('a', {
                                key: 'view',
                                href: `#/event/view/${event.id}`,
                                className: 'inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-600 bg-gray-100 hover:bg-gray-200'
                            }, [
                                React.createElement('i', { key: 'icon', className: 'fas fa-eye mr-2' }),
                                'View Event'
                            ])
                        ])
                    ]));
                }) : [
                    React.createElement('p', {
                        key: 'no-past',
                        className: 'text-gray-500 text-center py-8'
                    }, 'No past collaborative events')
                ])
            ])
        ]);
    } catch (error) {
        return null;
    }
}

window.CollaborativeEventsSection = CollaborativeEventsSection;
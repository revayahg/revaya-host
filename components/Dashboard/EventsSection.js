// EventsSection - Updated 2025-01-04 - Fixed to use end_date for past/upcoming logic
function EventsSection({ events = [], onDeleteEvent, loading = false }) {
    try {
        if (loading) {
            return React.createElement('div', {
                className: 'space-y-6'
            }, [
                React.createElement('h2', {
                    key: 'title',
                    className: 'text-xl font-semibold text-gray-900'
                }, 'Events I Created'),
                window.SkeletonLoader ? React.createElement(window.SkeletonLoader, {
                    key: 'skeleton',
                    type: 'card',
                    count: 3
                }) : React.createElement('div', {
                    key: 'loading',
                    className: 'text-center py-8'
                }, 'Loading events...')
            ]);
        }

        if (events.length === 0) {
            return React.createElement('div', {
                className: 'text-center py-12'
            }, [
                React.createElement('div', {
                    key: 'icon',
                    className: 'text-gray-400 mb-4'
                }, React.createElement('i', { className: 'fas fa-calendar fa-3x' })),
                React.createElement('h3', {
                    key: 'title',
                    className: 'text-lg font-medium text-gray-900 mb-2'
                }, 'No events yet'),
                React.createElement('p', {
                    key: 'desc',
                    className: 'text-gray-500 mb-4'
                }, 'Get started by creating your first event'),
                React.createElement('a', {
                    key: 'create-btn',
                    href: '#/event-form',
                    className: 'px-3 py-2 sm:px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm sm:text-base flex items-center justify-center'
                }, [
                    React.createElement('i', { key: 'icon', className: 'fas fa-plus mr-2' }),
                    'Create Event'
                ])
            ]);
        }

        // Filter events by date - use end_date for past/upcoming determination
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
            return event.end_date || event.date || event.start_date;
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

        const upcomingEvents = events.filter(event => {
            const eventDateStr = getEventDate(event);
            if (!eventDateStr) {
                // Events with no date should be treated as upcoming
                return true;
            }
            const eventDate = new Date(eventDateStr);
            eventDate.setHours(0, 0, 0, 0); // Normalize to midnight
            return eventDate >= currentDate;
        }).sort((a, b) => {
            const dateA = getEventDate(a);
            const dateB = getEventDate(b);
            
            // Events without dates should come first (most urgent)
            if (!dateA && !dateB) return 0;
            if (!dateA) return -1;
            if (!dateB) return 1;
            
            // Then sort by date
            return new Date(dateA) - new Date(dateB); // Ascending order for upcoming events
        });

        const pastEvents = events.filter(event => {
            const eventDateStr = getEventDate(event);
            if (!eventDateStr) return false;
            const eventDate = new Date(eventDateStr);
            eventDate.setHours(0, 0, 0, 0); // Normalize to midnight
            return eventDate < currentDate;
        }).sort((a, b) => {
            const dateA = new Date(getEventDate(a));
            const dateB = new Date(getEventDate(b));
            return dateB - dateA; // Descending order for past events
        });

        return React.createElement('div', {
            className: 'space-y-8'
        }, [
            React.createElement('h2', {
                key: 'title',
                className: 'text-xl font-semibold text-gray-900'
            }, 'Events I Created'),
            
            // Upcoming Events Section
            React.createElement('div', {
                key: 'upcoming-section',
                className: 'space-y-4'
            }, [
                React.createElement('h3', {
                    key: 'upcoming-title',
                    className: 'text-lg font-medium text-gray-800'
                }, `Upcoming Events (${upcomingEvents.length})`),
                React.createElement('div', {
                    key: 'upcoming-grid',
                    className: 'grid gap-6'
                }, upcomingEvents.length > 0 ? upcomingEvents.map(event =>
                    React.createElement('div', {
                        key: event.id,
                        className: 'bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow'
                    }, React.createElement('div', {
                        className: 'flex justify-between items-start'
                    }, [
                        React.createElement('div', {
                            key: 'content',
                            className: 'flex-1'
                        }, [
                            React.createElement('a', {
                                key: 'title',
                                href: `#/event/view/${event.id}`,
                                className: 'block hover:text-indigo-600 transition-colors'
                            }, React.createElement('h3', {
                                className: 'text-lg font-medium text-gray-900'
                            }, event.name || event.title)),
                            React.createElement('p', {
                                key: 'date',
                                className: 'mt-1 text-sm text-gray-500'
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
                            })())
                        ]),
                        React.createElement('div', {
                            key: 'actions',
                            className: 'flex space-x-3'
                        }, [
                            React.createElement('a', {
                                key: 'edit',
                                href: `#/event/edit/${event.id}`,
                                className: 'inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50'
                            }, [
                                React.createElement('i', { key: 'icon', className: 'fas fa-edit mr-2' }),
                                'Edit'
                            ]),
                            React.createElement('button', {
                                key: 'delete',
                                onClick: (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Delete button clicked for event:', event.id); // Debug log
                                    onDeleteEvent(event.id);
                                },
                                className: 'inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors',
                                title: 'Delete this event permanently'
                            }, [
                                React.createElement('i', { key: 'icon', className: 'fas fa-trash-alt mr-2' }),
                                'Delete'
                            ])
                        ])
                    ]))
                ) : [
                    React.createElement('p', {
                        key: 'no-upcoming',
                        className: 'text-gray-500 text-center py-8'
                    }, 'No upcoming events')
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
                }, `My Past Events (${pastEvents.length})`),
                React.createElement('div', {
                    key: 'past-grid',
                    className: 'grid gap-6'
                }, pastEvents.length > 0 ? pastEvents.map(event =>
                    React.createElement('div', {
                        key: event.id,
                        className: 'bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow opacity-75'
                    }, React.createElement('div', {
                        className: 'flex justify-between items-start'
                    }, [
                        React.createElement('div', {
                            key: 'content',
                            className: 'flex-1'
                        }, [
                            React.createElement('a', {
                                key: 'title',
                                href: `#/event/view/${event.id}`,
                                className: 'block hover:text-indigo-600 transition-colors'
                            }, React.createElement('h3', {
                                className: 'text-lg font-medium text-gray-900'
                            }, event.name || event.title)),
                            React.createElement('p', {
                                key: 'date',
                                className: 'mt-1 text-sm text-gray-500'
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
                            })())
                        ]),
                        React.createElement('div', {
                            key: 'actions',
                            className: 'flex space-x-3'
                        }, [
                            React.createElement('a', {
                                key: 'view',
                                href: `#/event/view/${event.id}`,
                                className: 'inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50'
                            }, [
                                React.createElement('i', { key: 'icon', className: 'fas fa-eye mr-2' }),
                                'View'
                            ])
                        ])
                    ]))
                ) : [
                    React.createElement('p', {
                        key: 'no-past',
                        className: 'text-gray-500 text-center py-8'
                    }, 'No past events')
                ])
            ])
        ]);
    } catch (error) {
        return null;
    }
}

window.EventsSection = EventsSection;

// Also export for potential named imports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventsSection;
}
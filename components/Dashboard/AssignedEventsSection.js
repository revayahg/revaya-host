// AssignedEventsSection - Updated 2025-01-04 - Fixed to use end_date for past/upcoming logic
function AssignedEventsSection({ collaborativeEvents = [], loadingAssigned = false, calculateDaysToGo }) {
    try {
        if (loadingAssigned) {
            return React.createElement('section', {
                className: 'mt-8'
            }, [
                React.createElement('h2', {
                    key: 'title',
                    className: 'text-xl font-semibold mb-4'
                }, 'Events I\'m Collaborating On'),
                window.SkeletonLoader ? React.createElement(window.SkeletonLoader, {
                    key: 'skeleton',
                    type: 'list',
                    count: 2
                }) : React.createElement('div', {
                    key: 'loading',
                    className: 'text-center py-4'
                }, 'Loading collaborative events...')
            ]);
        }

        if (collaborativeEvents.length === 0) {
            return React.createElement('section', {
                className: 'mt-8'
            }, [
                React.createElement('h2', {
                    key: 'title',
                    className: 'text-xl font-semibold mb-4'
                }, 'Events I\'m Collaborating On'),
                React.createElement('p', {
                    key: 'no-events',
                    className: 'text-gray-500 italic'
                }, 'You haven\'t been invited to collaborate on any events yet.')
            ]);
        }

        // Filter collaborative events by date with null checks
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
        
        console.log('🔍 AssignedEventsSection - Total collaborative events received:', collaborativeEvents.length);
        collaborativeEvents.forEach((collaboration, index) => {
            console.log(`  ${index + 1}. Event: "${collaboration.event?.name || collaboration.event?.title}", Date: ${getEventDate(collaboration.event)}`);
        });

        const upcomingCollaborativeEvents = collaborativeEvents.filter(collaboration => {
            if (!collaboration || !collaboration.event) {
                console.log('❌ Filtering out collaboration - missing collaboration or event');
                return false;
            }
            const eventDateStr = getEventDate(collaboration.event);
            if (!eventDateStr) {
                // Events with no date should be treated as upcoming
                console.log(`📅 "${collaboration.event.name || collaboration.event.title}" - No date set, treating as upcoming`);
                return true;
            }
            const normalizedEventDate = new Date(eventDateStr);
            normalizedEventDate.setHours(0, 0, 0, 0); // Normalize to midnight
            const isUpcoming = normalizedEventDate >= currentDate;
            console.log(`📅 "${collaboration.event.name || collaboration.event.title}" - Date: ${eventDateStr}, Is upcoming: ${isUpcoming}`);
            return isUpcoming;
        }).sort((a, b) => {
            const dateA = getEventDate(a.event);
            const dateB = getEventDate(b.event);
            
            // Events without dates should come first (most urgent)
            if (!dateA && !dateB) return 0;
            if (!dateA) return -1;
            if (!dateB) return 1;
            
            // Then sort by date
            return new Date(dateA) - new Date(dateB); // Ascending for upcoming
        });

        console.log('✅ Upcoming collaborative events after filtering:', upcomingCollaborativeEvents.length);

        return React.createElement('section', {
            className: 'mt-8'
        }, [
            React.createElement('h2', {
                key: 'title',
                className: 'text-xl font-semibold mb-4'
            }, 'Events I\'m Collaborating On'),
            
            React.createElement('div', {
                key: 'events-sections',
                className: 'space-y-8'
            }, [
                // Upcoming collaborative events
                React.createElement('div', {
                    key: 'upcoming-collaborative',
                    className: 'space-y-4'
                }, [
                    React.createElement('h3', {
                        key: 'upcoming-title',
                        className: 'text-lg font-medium text-gray-800'
                    }, `Upcoming Events I'm Collaborating On (${upcomingCollaborativeEvents.length})`),
                    React.createElement('div', {
                        key: 'upcoming-list',
                        className: 'space-y-4'
                    }, upcomingCollaborativeEvents.length > 0 ? upcomingCollaborativeEvents.map(collaboration => {
                        const event = collaboration.event;
                        if (!event) return null;
                        
                        const daysToGo = calculateDaysToGo && (event.end_date || event.start_date) ? calculateDaysToGo(event.end_date || event.start_date) : null;
                        return React.createElement('a', {
                            key: `upcoming-${event.id}-${collaboration.role}-${collaboration.user_id || 'unknown'}`,
                            href: `#/event/view/${event.id}`,
                            className: 'block p-4 bg-white rounded shadow mb-4 hover:shadow-md transition-shadow cursor-pointer'
                        }, [
                            React.createElement('div', {
                                key: 'header',
                                className: 'flex justify-between items-start mb-2'
                            }, [
                                React.createElement('div', {
                                    key: 'title-section'
                                }, [
                                    React.createElement('h3', {
                                        key: 'name',
                                        className: 'text-md font-semibold text-gray-900 hover:text-indigo-600'
                                    }, event.name),
                                    React.createElement('p', {
                                        key: 'role',
                                        className: 'text-sm text-indigo-600 font-medium'
                                    }, `Role: ${collaboration.role.charAt(0).toUpperCase() + collaboration.role.slice(1)}`)
                                ]),
                                daysToGo ? React.createElement('span', {
                                    key: 'days-tag',
                                    className: `text-xs font-medium px-2 py-1 rounded-full ${daysToGo.color}`
                                }, daysToGo.text) : null
                            ]),
                            React.createElement('p', {
                                key: 'details',
                                className: 'text-sm text-gray-600'
                            }, (() => {
                                const displayData = getDisplayDate(event);
                                if (!displayData) return 'Date TBD';
                                
                                let dateStr;
                                if (typeof displayData === 'object' && displayData.isMultiDate) {
                                    // Multi-date event - show date range
                                    const firstDateFormatted = window.formatLongDate ? window.formatLongDate(displayData.firstDate) : new Date(displayData.firstDate).toLocaleDateString();
                                    const lastDateFormatted = window.formatLongDate ? window.formatLongDate(displayData.lastDate) : new Date(displayData.lastDate).toLocaleDateString();
                                    dateStr = `${firstDateFormatted} - ${lastDateFormatted}`;
                                } else {
                                    // Single date event
                                    dateStr = window.formatLongDate ? window.formatLongDate(displayData) : new Date(displayData).toLocaleDateString();
                                }
                                return `${dateStr} • ${event.location || 'Location TBD'}`;
                            })()),
                            React.createElement('div', {
                                key: 'footer',
                                className: 'flex items-center justify-between mt-2'
                            }, [
                                React.createElement('span', {
                                    key: 'badge',
                                    className: 'text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full'
                                }, 'Collaborating'),
                                React.createElement('i', {
                                    key: 'arrow',
                                    className: 'fas fa-arrow-right text-gray-400'
                                })
                            ])
                        ]);
                    }) : [
                        React.createElement('p', {
                            key: 'no-upcoming',
                            className: 'text-gray-500 text-center py-8'
                        }, 'No upcoming collaborative events')
                    ])
                ])
            ])
        ]);
    } catch (error) {
        return React.createElement('div', {
            className: 'mt-8 p-4 bg-red-50 border border-red-200 rounded-lg'
        }, [
            React.createElement('h3', {
                key: 'error-title',
                className: 'text-red-800 font-medium'
            }, 'Error Loading Events I\'m Collaborating On'),
            React.createElement('p', {
                key: 'error-message', 
                className: 'text-red-600 text-sm mt-1'
            }, 'There was an issue loading your collaborative events.')
        ]);
    }
}

window.AssignedEventsSection = AssignedEventsSection;

// Also export for potential named imports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssignedEventsSection;
}
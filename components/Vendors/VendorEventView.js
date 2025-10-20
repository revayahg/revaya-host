function VendorEventView({ eventId }) {
    try {
        const [event, setEvent] = React.useState(null);
        const [myTasks, setMyTasks] = React.useState([]);
        const [myPins, setMyPins] = React.useState([]);
        const [loading, setLoading] = React.useState(true);
        const [hasAccess, setHasAccess] = React.useState(false);
        const [currentVendorId, setCurrentVendorId] = React.useState(null);
        const [currentVendorName, setCurrentVendorName] = React.useState('');
        const [debugInfo, setDebugInfo] = React.useState('');
        const [assignedVendors, setAssignedVendors] = React.useState([]);
        const authContext = React.useContext(window.AuthContext || React.createContext({}));
        const { user, loading: authLoading } = authContext;

        React.useEffect(() => {
            if (!authLoading && eventId && user) {
                checkAccessAndLoadEvent();
            }
        }, [eventId, user, authLoading]);

        const checkAccessAndLoadEvent = async () => {
            try {
                setLoading(true);
                
                const cleanEventId = eventId.split('?')[0];
                
                const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
                const specifiedVendorId = urlParams.get('vendor');
                
                const { data: vendorProfiles, error: profileError } = await window.supabaseClient
                    .from('vendor_profiles')
                    .select('id, name, company, email')
                    .eq('user_id', user.id);


                if (profileError) {
                    setDebugInfo(`Profile error: ${profileError.message}`);
                    setHasAccess(false);
                    return;
                }

                if (!vendorProfiles || vendorProfiles.length === 0) {
                    setDebugInfo('No vendor profiles found for this user');
                    setHasAccess(false);
                    return;
                }

                let selectedVendorProfile;
                if (specifiedVendorId) {
                    selectedVendorProfile = vendorProfiles.find(vp => vp.id === specifiedVendorId);
                    if (!selectedVendorProfile) {
                        setDebugInfo(`Vendor profile ${specifiedVendorId} not found or not owned by user`);
                        setHasAccess(false);
                        return;
                    }
                } else {
                    selectedVendorProfile = vendorProfiles[0];
                }

                setCurrentVendorId(selectedVendorProfile.id);
                setCurrentVendorName(selectedVendorProfile.company || selectedVendorProfile.name);

                const { data: assignment, error: assignmentError } = await window.supabaseClient
                    .from('event_invitations')
                    .select('id, response, event_id, vendor_profile_id')
                    .eq('event_id', cleanEventId)
                    .eq('vendor_profile_id', selectedVendorProfile.id);


                if (assignmentError) {
                    setDebugInfo(`Assignment error: ${assignmentError.message}`);
                    setHasAccess(false);
                    return;
                }

                if (!assignment || assignment.length === 0) {
                    setDebugInfo('No invitation found for this vendor profile and event');
                    setHasAccess(false);
                    return;
                }

                const invitation = assignment[0];

                if (invitation.response !== 'accepted') {
                    setDebugInfo(`Invitation status: ${invitation.response || 'pending'}`);
                    setHasAccess(false);
                    return;
                }

                const { data: eventData, error: eventError } = await window.supabaseClient
                    .from('events')
                    .select('*')
                    .eq('id', cleanEventId)
                    .maybeSingle();

                if (eventError) {
                    setDebugInfo(`Event error: ${eventError.message}`);
                    throw eventError;
                }

                if (!eventData) {
                    setDebugInfo('Event not found');
                    setHasAccess(false);
                    return;
                }
                
                setEvent(eventData);
                setHasAccess(true);
                setDebugInfo('');
                
                await Promise.all([
                    loadVendorTasks(selectedVendorProfile.id, cleanEventId),
                    loadVendorPins(selectedVendorProfile.id, cleanEventId),
                    loadAssignedVendorsForEvent(cleanEventId)
                ]);
                
            } catch (error) {
                setDebugInfo(`Unexpected error: ${error.message}`);
                setHasAccess(false);
                setEvent(null);
            } finally {
                setLoading(false);
            }
        };

        const loadVendorTasks = async (vendorId, cleanEventId) => {
            try {
                if (window.TaskAPI) {
                    const vendorTasks = await window.TaskAPI.getVendorTasks(vendorId, cleanEventId || eventId.split('?')[0]);
                    setMyTasks(vendorTasks || []);
                }
            } catch (error) {
                setMyTasks([]);
            }
        };

        const loadVendorPins = async (vendorId, cleanEventId) => {
            try {
                if (window.PinAPI) {
                    const vendorPins = await window.PinAPI.getVendorPins(cleanEventId || eventId.split('?')[0], vendorId);
                    setMyPins(vendorPins || []);
                }
            } catch (error) {
                setMyPins([]);
            }
        };

        const loadAssignedVendorsForEvent = async (cleanEventId) => {
            try {
                
                if (window.EventVendorAPI && typeof window.EventVendorAPI.getEventVendors === 'function') {
                    const eventVendors = await window.EventVendorAPI.getEventVendors(cleanEventId);
                    
                    const vendors = eventVendors.map(item => ({
                        vendorProfileId: item.vendor_id,
                        id: item.vendor_id,
                        name: item.vendor_profiles?.company || item.vendor_profiles?.name || 'Unknown Vendor',
                        company: item.vendor_profiles?.company,
                        email: item.vendor_profiles?.email || '',
                        status: item.status || 'pending'
                    }));
                    
                    setAssignedVendors(vendors);
                } else {
                    setAssignedVendors([]);
                }
            } catch (error) {
                setAssignedVendors([]);
            }
        };

        if (authLoading || loading) {
            return React.createElement('div', {
                className: 'container mx-auto px-4 py-8'
            }, React.createElement('div', {
                className: 'flex items-center justify-center min-h-[400px]'
            }, React.createElement('div', {
                className: 'text-center'
            }, [
                React.createElement('div', {
                    key: 'spinner',
                    className: 'animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto mb-4'
                }),
                React.createElement('p', {
                    key: 'text',
                    className: 'text-gray-600'
                }, authLoading ? 'Loading authentication...' : 'Loading event details...')
            ])));
        }

        if (!authLoading && !user) {
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
                }, 'Please sign in to access this event.'),
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

        if (!hasAccess) {
            return React.createElement('div', {
                className: 'container mx-auto px-4 py-8'
            }, React.createElement('div', {
                className: 'text-center'
            }, [
                React.createElement('i', {
                    key: 'icon',
                    className: 'fas fa-ban text-4xl text-red-400 mb-4'
                }),
                React.createElement('h2', {
                    key: 'title',
                    className: 'text-2xl font-bold mb-2'
                }, 'Access Denied'),
                React.createElement('p', {
                    key: 'message',
                    className: 'text-gray-600'
                }, "You don't have access to this event or haven't accepted the invitation."),
                debugInfo && React.createElement('div', {
                    key: 'debug',
                    className: 'mt-4 p-4 bg-gray-100 rounded-lg'
                }, [
                    React.createElement('p', {
                        key: 'debug-info',
                        className: 'text-sm text-gray-700'
                    }, `Debug Info: ${debugInfo}`),
                    React.createElement('p', {
                        key: 'debug-ids',
                        className: 'text-xs text-gray-500 mt-2'
                    }, `Event ID: ${eventId.split('?')[0]} | User ID: ${user?.id}`)
                ]),
                React.createElement('button', {
                    key: 'return-btn',
                    onClick: () => window.location.hash = '#/dashboard',
                    className: 'mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700'
                }, 'Return to Dashboard')
            ]));
        }

        const cleanEventId = eventId.split('?')[0];

        return React.createElement('div', {
            className: 'min-h-screen bg-gray-50',
            'data-name': 'vendor-event-view'
        }, [
            // Header Section
            React.createElement('div', {
                key: 'header',
                className: 'bg-white border-b'
            }, React.createElement('div', {
                className: 'container mx-auto px-4 py-6'
            }, React.createElement('div', {
                className: 'flex justify-between items-start'
            }, [
                React.createElement('div', {
                    key: 'title-section'
                }, [
                    React.createElement('h1', {
                        key: 'title',
                        className: 'text-2xl font-bold text-gray-900'
                    }, event.name),
                    React.createElement('p', {
                        key: 'vendor-name',
                        className: 'text-indigo-600 font-medium'
                    }, `Viewing as: ${currentVendorName}`),
                    React.createElement('div', {
                        key: 'event-details',
                        className: 'flex items-center space-x-4 text-gray-600 mt-2'
                    }, [
                        React.createElement('p', {
                            key: 'dates'
                        }, [
                            React.createElement('i', {
                                key: 'calendar-icon',
                                className: 'fas fa-calendar mr-1'
                            }),
                            `${new Date(event.start_date).toLocaleDateString()} - ${new Date(event.end_date).toLocaleDateString()}`
                        ]),
                        event.event_time && event.event_time !== 'TBD' && React.createElement('p', {
                            key: 'time'
                        }, [
                            React.createElement('i', {
                                key: 'clock-icon',
                                className: 'fas fa-clock mr-1'
                            }),
                            event.event_time
                        ]),
                        event.event_type && React.createElement('p', {
                            key: 'type'
                        }, [
                            React.createElement('i', {
                                key: 'tag-icon',
                                className: 'fas fa-tag mr-1'
                            }),
                            event.event_type
                        ])
                    ])
                ]),
                React.createElement('div', {
                    key: 'action-buttons',
                    className: 'flex items-center gap-2'
                }, [
                    React.createElement('button', {
                        key: 'back-btn',
                        onClick: () => window.location.hash = '#/dashboard',
                        className: 'px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2'
                    }, [
                        React.createElement('div', {
                            key: 'dashboard-icon',
                            className: 'icon-layout-dashboard text-lg'
                        }),
                        'Dashboard'
                    ]),
                    React.createElement('button', {
                        key: 'tasks-btn',
                        onClick: () => {
                            const taskManager = document.querySelector('[data-name="task-manager"]');
                            if (taskManager) {
                                taskManager.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        },
                        className: 'px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center'
                    }, [
                        React.createElement('div', {
                            key: 'tasks-icon',
                            className: 'icon-list-checks text-lg'
                        })
                    ])
                    // Messages button temporarily disabled
                    // React.createElement('button', {
                    //     key: 'messages-btn',
                    //     onClick: () => {
                    //         const messagesPanel = document.querySelector('[data-name="event-messages"]');
                    //         if (messagesPanel) {
                    //             messagesPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    //         }
                    //     },
                    //     className: 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center'
                    // }, [
                    //     React.createElement('div', {
                    //         key: 'messages-icon',
                    //         className: 'icon-mail text-lg'
                    //     })
                    // ])
                ])
            ]))),

            // Main Content Section
            React.createElement('div', {
                key: 'main-content',
                className: 'container mx-auto px-4 py-6'
            }, React.createElement('div', {
                className: 'grid grid-cols-1 lg:grid-cols-3 gap-6'
            }, [
                // Left Column - Main Content
                React.createElement('div', {
                    key: 'main-column',
                    className: 'lg:col-span-2 space-y-6'
                }, [
                    // About Section
                    (event.about || event.description) && React.createElement('div', {
                        key: 'about-section',
                        className: 'bg-white rounded-lg shadow-sm p-6'
                    }, [
                        React.createElement('h2', {
                            key: 'about-title',
                            className: 'text-xl font-semibold text-gray-900 mb-4'
                        }, 'About This Event'),
                        React.createElement('div', {
                            key: 'about-content',
                            className: 'text-gray-700 leading-relaxed'
                        }, React.createElement('p', {}, event.about || event.description))
                    ]),
                    React.createElement(window.EventMap, {
                        key: 'event-map',
                        imageUrl: event.event_map,
                        eventId: cleanEventId,
                        viewMode: 'readonly',
                        currentVendorId: currentVendorId,
                        allowPinCreation: false,
                        allowPinDragging: false
                    }),
                    React.createElement('div', {
                        key: 'task-manager-section',
                        'data-name': 'task-manager'
                    }, React.createElement(window.TaskManager, {
                        key: 'task-manager',
                        eventId: cleanEventId,
                        event: event,
                        tasks: myTasks,
                        onTasksChange: (updatedTasks) => {
                            setMyTasks(updatedTasks);
                        },
                        assignedVendors: assignedVendors,
                        isEditing: false
                    })),

                    // Event Messages - temporarily disabled
                    // React.createElement('div', {
                    //     key: 'event-messages',
                    //     className: 'bg-white rounded-lg shadow-sm p-6',
                    //     'data-name': 'event-messages'
                    // }, [
                    //     React.createElement('h2', {
                    //         key: 'messages-title',
                    //         className: 'text-xl font-semibold text-gray-900 mb-4'
                    //     }, 'Event Messages'),
                    // React.createElement(window.NEWEventMessagesPanel, {
                    //     key: 'messages-panel',
                    //     eventId: cleanEventId,
                    //     vendorProfileId: currentVendorId,
                    //     currentVendorId: currentVendorId,
                    //     userVendorProfile: { 
                    //         id: currentVendorId, 
                    //         name: currentVendorName,
                    //         company: currentVendorName,
                    //         isVendor: true
                    //     },
                    //     onMessageSent: () => {
                    //         // Force refresh of the messages panel
                    //         window.location.reload();
                    //     }
                    // })
                    // ])
                ]),

                // Right Sidebar
                React.createElement('div', {
                    key: 'sidebar',
                    className: 'lg:col-span-1 space-y-6'
                }, [
                    // Event Info Section
                    React.createElement('div', {
                        key: 'event-info',
                        className: 'bg-white rounded-lg p-4 shadow-sm'
                    }, [
                        React.createElement('h3', {
                            key: 'info-title',
                            className: 'text-lg font-semibold mb-3 flex items-center'
                        }, [
                            React.createElement('i', {
                                key: 'info-icon',
                                className: 'fas fa-info-circle mr-2 text-blue-600'
                            }),
                            'Event Details'
                        ]),
                        React.createElement('div', {
                            key: 'info-content',
                            className: 'space-y-3 text-sm'
                        }, [
                            React.createElement('div', {
                                key: 'location'
                            }, [
                                React.createElement('span', {
                                    key: 'location-label',
                                    className: 'text-gray-600'
                                }, 'Location:'),
                                React.createElement('p', {
                                    key: 'location-value',
                                    className: 'font-medium'
                                }, event.location || 'Not specified')
                            ]),
                            React.createElement('div', {
                                key: 'guests'
                            }, [
                                React.createElement('span', {
                                    key: 'guests-label',
                                    className: 'text-gray-600'
                                }, 'Expected Guests:'),
                                React.createElement('p', {
                                    key: 'guests-value',
                                    className: 'font-medium'
                                }, event.attendance_range || 'Not specified')
                            ]),
                            React.createElement('div', {
                                key: 'support-staff'
                            }, [
                                React.createElement('span', {
                                    key: 'support-staff-label',
                                    className: 'text-gray-600'
                                }, 'Support Staff Needed:'),
                                React.createElement('p', {
                                    key: 'support-staff-value',
                                    className: 'font-medium'
                                }, event.support_staff_needed || 'Not specified')
                            ]),
                            React.createElement('div', {
                                key: 'type'
                            }, [
                                React.createElement('span', {
                                    key: 'type-label',
                                    className: 'text-gray-600'
                                }, 'Event Type:'),
                                React.createElement('p', {
                                    key: 'type-value',
                                    className: 'font-medium'
                                }, event.event_type || 'Not specified')
                            ])
                        ])
                    ]),

                    // Event Schedule Section
                    React.createElement('div', {
                        key: 'event-schedule',
                        className: 'bg-white rounded-lg p-4 shadow-sm'
                    }, [
                        React.createElement('h3', {
                            key: 'schedule-title',
                            className: 'text-lg font-semibold mb-3 flex items-center'
                        }, [
                            React.createElement('i', {
                                key: 'schedule-icon',
                                className: 'fas fa-calendar-alt mr-2 text-green-600'
                            }),
                            'Event Schedule'
                        ]),
                        React.createElement('div', {
                            key: 'schedule-content',
                            className: 'space-y-3'
                        }, 
                        // Show event schedule if available
                        event.eventSchedule && event.eventSchedule.length > 0 ? 
                            event.eventSchedule.map((schedule, index) =>
                                React.createElement('div', { 
                                    key: `schedule-${index}`, 
                                    className: 'p-3 bg-gray-50 rounded-lg border-l-4 border-green-500' 
                                }, [
                                    React.createElement('div', { 
                                        key: `schedule-header-${index}`,
                                        className: 'flex justify-between items-center mb-2' 
                                    }, [
                                        React.createElement('span', { 
                                            key: `day-label-${index}`,
                                            className: 'font-medium text-gray-900' 
                                        }, `Day ${index + 1}`),
                                        React.createElement('span', { 
                                            key: `date-label-${index}`,
                                            className: 'text-sm text-gray-600' 
                                        }, new Date(schedule.date).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        }))
                                    ]),
                                    schedule.startTime && schedule.endTime && React.createElement('div', { 
                                        key: `time-range-${index}`,
                                        className: 'text-sm text-gray-700' 
                                    }, `${schedule.startTime} - ${schedule.endTime}`)
                                ])
                            )
                            : React.createElement('div', { 
                                key: 'no-schedule',
                                className: 'text-sm text-gray-500' 
                            }, 'No schedule specified')
                        )
                    ]),

                    // Vendor Types Needed Section
                    event.vendor_categories && event.vendor_categories.length > 0 && React.createElement('div', {
                        key: 'vendor-categories',
                        className: 'bg-white rounded-lg p-4 shadow-sm'
                    }, [
                        React.createElement('h3', {
                            key: 'categories-title',
                            className: 'text-lg font-semibold mb-3 flex items-center'
                        }, [
                            React.createElement('i', {
                                key: 'categories-icon',
                                className: 'fas fa-users mr-2 text-purple-600'
                            }),
                            'Vendor types needed:'
                        ]),
                        React.createElement('div', {
                            key: 'categories-content',
                            className: 'space-y-2'
                        }, event.vendor_categories.map((category, index) => {
                            // Helper function to get category display info
                            const getVendorCategoryDisplay = (categoryName) => {
                                const categories = window.VENDOR_CATEGORIES || {};
                                
                                for (const groupName in categories) {
                                    const group = categories[groupName];
                                    const foundCategory = group.find(item => item.name === categoryName);
                                    if (foundCategory) {
                                        return foundCategory;
                                    }
                                }
                                
                                return { name: categoryName, icon: '🔧' };
                            };

                            const categoryInfo = getVendorCategoryDisplay(category);
                            return React.createElement('div', {
                                key: index,
                                className: 'flex items-center space-x-2 text-sm'
                            }, [
                                React.createElement('span', {
                                    key: 'icon',
                                    className: 'text-lg'
                                }, categoryInfo.icon),
                                React.createElement('span', {
                                    key: 'name',
                                    className: 'font-medium text-gray-900'
                                }, categoryInfo.name)
                            ]);
                        }))
                    ])
                ])
            ]))
        ]);
    } catch (error) {
        return null;
    }
}

window.VendorEventView = VendorEventView;
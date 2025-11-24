// Mobile-optimized ViewEventDetailContent - Updated 2025-01-04
function ViewEventDetailContent({ 
    event, 
    eventId, 
    editingBudget, 
    getCurrentTotals, 
    calculateDaysToGo, 
    handleEditBudget, 
    handleSaveBudget, 
    handleCancelBudget, 
    handleTotalsChange,
    tasks,
    loadingTasks,
    onTasksChange,
    eventDates,
    userRole,
    loadingRole,
    isOwner = false,
    canViewBudget = true
}) {
    // Add state for task form (same as TaskManager)
    const [showAddTaskForm, setShowAddTaskForm] = React.useState(false);
    const [editingTask, setEditingTask] = React.useState(null);
    const [saving, setSaving] = React.useState(false);
    
    // Handle task save (same as TaskManager)
    const handleSaveTask = async () => {
        // Close form and reload tasks
        setShowAddTaskForm(false);
        setEditingTask(null);
        if (onTasksChange) {
            onTasksChange();
        }
    };
    
    // Always call hooks at the top level, regardless of conditions
    const context = React.useContext(window.AuthContext || React.createContext({}));
    
    // Handle scrolling to sections - always register this effect
    React.useEffect(() => {
        const handler = (e) => {
            try {
                const url = new URL(window.location);
                const sectionFromEvent = e?.detail?.section;
                const section = sectionFromEvent || url.searchParams.get('tab');

                const targets = {
                    budget: document.querySelector('[data-name="budget-section"]') || document.querySelector('[data-section="budget"]'),
                    tasks: document.querySelector('[data-name="tasks-section"]') || document.querySelector('[data-section="tasks"]'),
                    messages: document.querySelector('[data-name="messages-section"]') || document.querySelector('[data-section="messages"]')
                };

                const el = section ? targets[section] : null;
                if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' });
            } catch {}
        };

        // Only act if a tab is actually present on load
        try {
            const url = new URL(window.location);
            const tab = url.searchParams.get('tab');
            if (tab) handler({ detail: { section: tab } });
        } catch {}

        window.addEventListener('scrollToSection', handler);
        return () => window.removeEventListener('scrollToSection', handler);
    }, [eventId]);

    try {
        const { user } = context;
        
        if (!event || !user || loadingRole) {
            return React.createElement('div', {
                className: 'min-h-screen flex items-center justify-center'
            }, React.createElement('div', {
                className: 'text-center'
            }, [
                React.createElement('i', {
                    key: 'loading-icon',
                    className: 'fas fa-spinner fa-spin text-4xl text-indigo-600 mb-4'
                }),
                React.createElement('p', {
                    key: 'loading-text',
                    className: 'text-gray-600'
                }, 'Loading...')
            ]));
        }

        const currentTotals = getCurrentTotals();
        
        // Determine user permissions based on role
        const isOwner = event?.user_id === user?.id || event?.created_by === user?.id;
        const canEdit = isOwner || userRole === 'editor' || userRole === 'admin';
        const canManageCollaborators = isOwner || userRole === 'editor' || userRole === 'admin';
        const canManage = isOwner || userRole === 'editor' || userRole === 'admin';
        const isViewer = userRole === 'viewer';
        const hasEventAccess = isOwner || userRole === 'viewer' || userRole === 'editor' || userRole === 'admin';
        const permissionsReady = Boolean(user && event && !loadingRole);


        return React.createElement('div', {
            className: 'min-h-screen bg-gray-50 mobile-optimized',
            'data-name': 'view-event-detail-content',
            'data-file': 'components/Events/ViewEventDetailContent.js'
        }, [
            // Header Section
            React.createElement('div', {
                key: 'header',
                className: 'bg-white border-b mobile-header'
            }, React.createElement('div', {
                className: 'container mx-auto px-4 py-6'
            }, React.createElement('div', {
                className: 'flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4'
            }, [
                React.createElement('div', {
                    key: 'header-content',
                    className: 'flex items-center gap-4'
                }, [
                    // Event logo if available - check multiple possible logo fields
                    (event.logo || event.event_logo || event.icon) && React.createElement('div', {
                        key: 'event-logo-container',
                        className: 'flex-shrink-0',
                        'data-name': 'event-logo-container',
                        'data-file': 'components/Events/ViewEventDetailContent.js'
                    }, React.createElement('img', {
                        key: 'event-logo',
                        src: event.logo || event.event_logo || event.icon,
                        alt: `${event.name} logo`,
                        className: 'w-12 h-12 object-contain rounded-lg border border-gray-200 shadow-sm bg-white p-1',
                        onError: (e) => {
                            e.target.style.display = 'none';
                        },
                        onLoad: (e) => {
                        },
                        'data-name': 'event-logo-image',
                        'data-file': 'components/Events/ViewEventDetailContent.js'
                    })),
                    
                    // Event title and badges
                    React.createElement('div', {
                        key: 'event-info'
                    }, [
                        React.createElement('h1', {
                            key: 'event-title',
                            className: 'text-2xl sm:text-3xl font-bold text-gray-900 mb-2'
                        }, event.name),

                        React.createElement('div', {
                            key: 'event-badges',
                            className: 'flex flex-wrap gap-2'
                        }, [
                            React.createElement('span', {
                                key: 'event-type-badge',
                                className: 'px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium'
                            }, event.event_type || 'Event')
                        ])
                    ])
                ]),
                React.createElement('div', {
                    key: 'header-actions',
                    className: 'flex flex-wrap gap-2 lg:gap-3'
                }, [
                    // Only show Manage button for admin/editor roles
                    canManage && React.createElement('button', {
                        key: 'manage-button',
                        onClick: () => window.location.hash = `#/event/edit/${eventId}`,
                        className: 'px-3 py-2 lg:px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center text-sm lg:text-base'
                    }, [
                        React.createElement('div', {
                            key: 'manage-icon',
                            className: 'icon-settings text-lg mr-2'
                        }),
                        'Manage'
                    ]),
                    // Budget button - only visible to owners and editors, NOT viewers
                    (isOwner || userRole === 'editor' || userRole === 'admin') && React.createElement('button', {
                        key: 'budget-button',
                        onClick: () => {
                            // Navigate to edit page with budget tab
                            window.location.hash = `#/event/edit/${eventId}`;
                            // Use setTimeout to ensure the page loads before setting the tab
                            setTimeout(() => {
                                const url = new URL(window.location);
                                url.searchParams.set('tab', 'budget');
                                window.history.pushState({}, '', url.toString());
                                // Force tab change by dispatching a custom event
                                window.dispatchEvent(new Event('tabchange'));
                            }, 100);
                        },
                        className: 'px-3 py-2 lg:px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center text-sm lg:text-base',
                        title: 'Manage Budget'
                    }, [
                        React.createElement('div', {
                            key: 'budget-icon',
                            className: 'icon-dollar-sign text-lg mr-2'
                        }),
                        'Budget'
                    ]),
                    // Tasks button - visible to all but read-only for viewers
                    React.createElement('button', {
                        key: 'tasks-button',
                        onClick: () => {
                            if (!canEdit) {
                                window.toast && window.toast.show('View-only access', 'info');
                                const url = new URL(window.location);
                                url.searchParams.set('tab', 'tasks');
                                window.history.replaceState({}, '', url.toString());
                                window.dispatchEvent(new CustomEvent('scrollToSection', { detail: { section: 'tasks' } }));
                                return;
                            }
                            // Navigate to edit page with tasks tab
                            window.location.hash = `#/event/edit/${eventId}`;
                            // Use setTimeout to ensure the page loads before setting the tab
                            setTimeout(() => {
                                const url = new URL(window.location);
                                url.searchParams.set('tab', 'tasks');
                                window.history.pushState({}, '', url.toString());
                                // Force tab change by dispatching a custom event
                                window.dispatchEvent(new Event('tabchange'));
                            }, 100);
                        },
                        className: `px-3 py-2 lg:px-4 ${isViewer ? 'bg-gray-600' : 'bg-green-600'} text-white rounded-lg hover:${isViewer ? 'bg-gray-700' : 'bg-green-700'} flex items-center text-sm lg:text-base`,
                        title: isViewer ? 'View Tasks (Read Only)' : 'Manage Tasks'
                    }, [
                        React.createElement('div', {
                            key: 'tasks-icon',
                            className: 'icon-list-checks text-lg mr-2'
                        }),
                        isViewer ? 'Tasks' : 'Tasks'
                    ]),

                    // Only show Team button for owners and editors
                    canManageCollaborators && React.createElement('button', {
                        key: 'collaborators-button',
                        onClick: () => {
                            // Navigate to edit page with collaborators tab
                            window.location.hash = `#/event/edit/${eventId}`;
                            // Use setTimeout to ensure the page loads before setting the tab
                            setTimeout(() => {
                                const url = new URL(window.location);
                                url.searchParams.set('tab', 'collaborators');
                                window.history.pushState({}, '', url.toString());
                                // Force tab change by dispatching a custom event
                                window.dispatchEvent(new Event('tabchange'));
                            }, 100);
                        },
                        className: 'px-3 py-2 lg:px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm lg:text-base'
                    }, [
                        React.createElement('div', {
                            key: 'collaborators-icon',
                            className: 'icon-user-plus text-lg mr-2'
                        }),
                        'Team'
                    ]),

                    // Event Chat button - everyone with event access
                    React.createElement('button', {
                        key: 'messages-button',
                        onClick: () => {
                            // Navigate to edit page with event-chat tab
                            window.location.hash = `#/event/edit/${eventId}`;
                            // Use setTimeout to ensure the page loads before setting the tab
                            setTimeout(() => {
                                const url = new URL(window.location);
                                url.searchParams.set('tab', 'event-chat');
                                window.history.pushState({}, '', url.toString());
                                // Force tab change by dispatching a custom event
                                window.dispatchEvent(new Event('tabchange'));
                            }, 100);
                        },
                        className: 'px-3 py-2 lg:px-4 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center text-sm lg:text-base',
                        title: 'Open Event Chat'
                    }, [
                        React.createElement('div', { key: 'messages-icon', className: 'icon-message-circle text-lg mr-2' }),
                        'Event Chat'
                    ]),

                    // Staff Management button - owners and editors only
                    canEdit && React.createElement('button', {
                        key: 'staff-button',
                        onClick: () => {
                            // Navigate to edit page with staff tab
                            window.location.hash = `#/event/edit/${eventId}`;
                            // Use setTimeout to ensure the page loads before setting the tab
                            setTimeout(() => {
                                const url = new URL(window.location);
                                url.searchParams.set('tab', 'staff');
                                window.history.pushState({}, '', url.toString());
                                // Force tab change by dispatching a custom event
                                window.dispatchEvent(new Event('tabchange'));
                            }, 100);
                        },
                        className: 'px-3 py-2 lg:px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center text-sm lg:text-base',
                        title: 'Manage Staff'
                    }, [
                        React.createElement('div', { key: 'staff-icon', className: 'icon-users text-lg mr-2' }),
                        'Staff'
                    ])
                ].filter(Boolean))
            ]))),

            // Main Content
            React.createElement('div', {
                key: 'main',
                className: 'container mx-auto px-4 py-6'
            }, React.createElement('div', {
                className: 'grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6'
            }, [
                // Left Column - Main Content
                React.createElement('div', {
                    key: 'main-content-left',
                    className: 'lg:col-span-2 space-y-4 lg:space-y-6'
                }, [
                    // Days Until Event Section
                    (event.start_date || event.end_date || event.date) && React.createElement('div', {
                        key: 'days-until-event-section',
                        className: 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl shadow-lg p-4 lg:p-5 relative overflow-hidden transform hover:scale-105 transition-all duration-300'
                    }, [
                        // Background decoration
                        React.createElement('div', {
                            key: 'bg-decoration',
                            className: 'absolute inset-0 bg-gradient-to-br from-white/10 to-transparent'
                        }),
                        React.createElement('div', {
                            key: 'bg-pattern',
                            className: 'absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-10 translate-x-10'
                        }),
                        React.createElement('div', {
                            key: 'bg-pattern-2',
                            className: 'absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-8 -translate-x-8'
                        }),
                        
                        // Main content
                        React.createElement('div', {
                            key: 'days-counter-container',
                            className: 'relative z-10 flex flex-col items-center justify-center text-center'
                        }, [
                            // Calendar icon
                            React.createElement('div', {
                                key: 'calendar-icon',
                                className: 'mb-2 p-2 bg-white/20 rounded-full backdrop-blur-sm'
                            }, React.createElement('div', {
                                className: 'icon-calendar text-lg text-white'
                            })),
                            
                            // Days counter
                            React.createElement('div', {
                                key: 'days-counter',
                                className: 'mb-1'
                            }, [
                                React.createElement('div', {
                                    key: 'days-number',
                                    className: 'text-3xl lg:text-4xl font-black text-white mb-1 drop-shadow-lg tracking-tight'
                                }, calculateDaysToGo(event.end_date || event.start_date || event.date))
                            ]),
                            
                            // Event date with enhanced styling
                            React.createElement('div', {
                                key: 'event-date',
                                className: 'mt-2 px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm border border-white/30'
                            }, React.createElement('div', {
                                className: 'text-xs lg:text-sm font-medium text-white flex items-center'
                            }, [
                                React.createElement('div', {
                                    key: 'date-icon',
                                    className: 'icon-clock text-xs mr-1'
                                }),
                                `Event Date: ${new Date(event.end_date || event.start_date || event.date).toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}`
                            ]))
                        ])
                    ]),

                    // About Section
                    (event.about || event.description) && React.createElement('div', {
                        key: 'about-section',
                        className: 'bg-white rounded-lg shadow-sm p-4 lg:p-6'
                    }, [
                        React.createElement('h2', {
                            key: 'about-title',
                            className: 'text-xl font-semibold text-gray-900 mb-4'
                        }, 'About This Event'),
                        React.createElement('div', {
                            key: 'about-content',
                            className: 'text-gray-700 leading-relaxed space-y-3'
                        }, [
                            React.createElement('p', {
                                key: 'description',
                                className: 'text-base'
                            }, event.description || 'No description provided.')
                        ])
                    ]),

                    // Event Map Section - enhanced with better visibility and error handling
                    event.event_map && React.createElement('div', {
                        key: 'event-map-section',
                        className: 'bg-white rounded-lg shadow-sm p-4 lg:p-6'
                    }, [
                        React.createElement('h3', {
                            key: 'map-title',
                            className: 'text-lg lg:text-xl font-semibold text-gray-900 mb-4 flex items-center'
                        }, [
                            React.createElement('div', {
                                key: 'map-icon',
                                className: 'icon-map text-xl text-blue-600 mr-2'
                            }),
                            'Event Map'
                        ]),
                        React.createElement(window.EventMap, {
                            key: 'event-map',
                            imageUrl: event.event_map,
                            eventId: eventId,
                            viewMode: canEdit ? "planner" : "readonly",
                            allowPinCreation: canEdit,
                            allowPinDragging: canEdit,
                            vendorId: null
                        })
                    ]),

                    // Messages Section (moved below event map)
                    React.createElement('div', {
                        key: 'messages-section',
                        'data-section': 'messages',
                        'data-name': 'messages-section',
                        className: 'bg-white rounded-lg shadow-sm min-h-[600px]'
                    }, [
                        React.createElement('div', {
                            key: 'messages-header',
                            className: 'p-4 border-b border-gray-200'
                        }, [
                            React.createElement('h3', {
                                key: 'messages-title',
                                className: 'text-lg font-semibold text-gray-900 flex items-center'
                            }, [
                                React.createElement('div', {
                                    key: 'messages-icon',
                                    className: 'icon-message-circle text-lg text-pink-600 mr-2'
                                }),
                                'Event Messages'
                            ]),
                            React.createElement('p', {
                                key: 'messages-subtitle',
                                className: 'text-sm text-gray-600 mt-1'
                            }, 'Collaborate with your team')
                        ]),
                        React.createElement('div', {
                            key: 'messages-content',
                            className: 'p-4 min-h-[540px]'
                        }, (() => {
                            // Simplified messaging access - if user can view this page, they can use messaging
                            if (!user) {
                                return React.createElement('div', { 
                                    key: 'no-user',
                                    className: 'text-center text-gray-500 py-8' 
                                }, 'Please log in to use messaging');
                            }
                            
                            if (!event) {
                                return React.createElement('div', { 
                                    key: 'no-event',
                                    className: 'text-center text-gray-500 py-8' 
                                }, 'Event not found');
                            }
                            
                            // If user got this far (can see the event page), they can access messaging
                            return React.createElement(window.GroupChatPanelV2, {
                                key: 'group-chat-panel',
                                eventId: eventId,
                                currentUser: user
                            });
                        })())
                    ])
                ]),

                // Right Sidebar
        React.createElement('div', {
            key: 'main-content-sidebar',
            className: 'lg:col-span-1 space-y-6'
        }, [
            // Event Schedule Section
            event.event_schedule && React.createElement('div', {
                key: 'event-schedule-section',
                className: 'bg-white rounded-lg shadow-sm p-6'
            }, [
                React.createElement('h3', {
                    key: 'schedule-title',
                    className: 'text-lg font-semibold text-gray-900 mb-4 flex items-center'
                }, [
                    React.createElement('div', {
                        key: 'schedule-icon',
                        className: 'icon-calendar text-lg text-green-600 mr-2'
                    }),
                    'Event Schedule'
                ]),
                React.createElement('div', {
                    key: 'schedule-content',
                    className: 'space-y-4'
                }, (() => {
                    try {
                        const schedule = typeof event.event_schedule === 'string' ? 
                            JSON.parse(event.event_schedule) : event.event_schedule;
                        
                        if (!schedule || !Array.isArray(schedule)) return null;
                        
                        return schedule.map((slot, index) => {
                            return React.createElement('div', {
                                key: `schedule-${index}`,
                                className: 'border-l-4 border-green-500 pl-4 py-2'
                            }, [
                                React.createElement('div', {
                                    key: 'date-header',
                                    className: 'font-semibold text-gray-900'
                                }, window.formatLongDate(slot.date)),
                                React.createElement('div', {
                                    key: 'time-display',
                                    className: 'text-sm text-gray-600 mt-1'
                                }, `${window.normalizeTime12h(slot.startTime)} — ${window.normalizeTime12h(slot.endTime)}`)
                            ]);
                        });
                    } catch (error) {
                        return React.createElement('p', {
                            className: 'text-sm text-gray-500'
                        }, 'Schedule information unavailable');
                    }
                })())
            ]),

            // Event Details Sidebar
            React.createElement('div', {
                key: 'event-detail-sidebar',
                'data-section': 'budget',
                'data-name': 'event-detail-sidebar'
            }, React.createElement(window.ViewEventDetailSidebar, {
                event: event,
                currentTotals: currentTotals,
                editingBudget: editingBudget,
                handleEditBudget: handleEditBudget,
                handleSaveBudget: handleSaveBudget,
                handleCancelBudget: handleCancelBudget,
                handleTotalsChange: handleTotalsChange,
                eventDates: eventDates,
                userRole: userRole,
                isViewer: isViewer,
                canViewBudget: canViewBudget
            })),
            
            // Budget Section - show real data only to owners and editors, not viewers
            React.createElement('div', {
                key: 'budget-section',
                'data-section': 'budget',
                'data-name': 'budget-section'
            }, (isOwner || userRole === 'editor' || userRole === 'admin')
                ? React.createElement(window.BudgetSummary, {
                    eventId: eventId,
                    budgetItems: event.budget_items || [],
                    onBudgetChange: handleTotalsChange,
                    canEdit: canEdit,
                    canViewBudget: true
                })
                : React.createElement('div', {
                    className: 'bg-white rounded-lg shadow p-6'
                }, [
                    React.createElement('h3', {
                        key: 'budget-title',
                        className: 'text-lg font-medium text-gray-900 mb-2'
                    }, 'Budget'),
                    React.createElement('p', {
                        key: 'budget-message',
                        className: 'text-gray-600'
                    }, 'Budget details are private and only visible to event owners and editors.')
                ])
            ),
            
            // Tasks Section
            React.createElement('div', {
                key: 'tasks-section',
                'data-section': 'tasks',
                'data-name': 'tasks-section'
            }, [
                React.createElement('div', {
                    key: 'tasks-header',
                    className: 'bg-white rounded-lg shadow-sm p-4 mb-4'
                }, [
                    React.createElement('div', {
                        key: 'tasks-header-content',
                        className: 'flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4'
                    }, [
                        React.createElement('div', {
                            key: 'tasks-title-section'
                        }, [
                            React.createElement('h3', {
                                key: 'tasks-title',
                                className: 'text-lg font-semibold text-gray-900 flex items-center'
                            }, [
                                React.createElement('div', {
                                    key: 'tasks-icon',
                                    className: 'icon-list-checks text-lg text-green-600 mr-2'
                                }),
                                'Tasks'
                            ]),
                            !canEdit && React.createElement('p', {
                                key: 'tasks-readonly-note',
                                className: 'text-sm text-gray-500 mt-2'
                            }, 'View-only access - tasks cannot be modified')
                        ]),
                        // Add Task button for owners and editors
                        canEdit && React.createElement('button', {
                            key: 'add-task-button',
                            onClick: () => setShowAddTaskForm(true),
                            className: 'px-3 py-2 sm:px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm sm:text-base flex items-center justify-center w-full sm:w-auto'
                        }, [
                            React.createElement('i', { key: 'add-icon', className: 'fas fa-plus mr-2' }),
                            'Add Task'
                        ])
                    ])
                ]),
                
                // Show Add Task Form when button is clicked (exact same as TaskManager)
                showAddTaskForm && React.createElement('div', {
                    key: 'add-task-form',
                    className: 'bg-gray-50 rounded-lg p-4 mb-4'
                }, [
                    React.createElement(window.EditTaskForm, {
                        key: 'edit-task-form',
                        task: editingTask,
                        eventId: eventId,
                        onSave: handleSaveTask,
                        onCancel: () => {
                            setShowAddTaskForm(false);
                            setEditingTask(null);
                        },
                        saving: saving
                    })
                ]),
                
                React.createElement(window.TaskList, {
                    key: 'tasks-list',
                    tasks: tasks || [],
                    onEdit: null,
                    assignedVendors: [],
                    onTasksChange: onTasksChange,
                    eventId: eventId,
                    canEdit: canEdit
                })
            ])
        ])
            ]))
        ]);

    } catch (error) {
        reportError(error);
        return React.createElement('div', {
            className: 'container mx-auto px-4 py-8'
        }, React.createElement('div', {
            className: 'bg-red-50 border-l-4 border-red-500 p-4'
        }, React.createElement('div', {
            className: 'flex'
        }, [
            React.createElement('div', {
                key: 'error-icon-container',
                className: 'flex-shrink-0'
            }, React.createElement('i', {
                key: 'error-icon',
                className: 'fas fa-exclamation-circle text-red-500'
            })),
            React.createElement('div', {
                key: 'error-content',
                className: 'ml-3'
            }, [
                React.createElement('h3', {
                    key: 'error-title',
                    className: 'text-red-800 font-medium'
                }, 'Error'),
                React.createElement('p', {
                    key: 'error-message',
                    className: 'text-red-700 mt-2'
                }, error.message)
            ])
        ])));
    }
}

window.ViewEventDetailContent = ViewEventDetailContent;
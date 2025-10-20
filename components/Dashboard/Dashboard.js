// Dashboard - Updated 2025-01-04 - Fixed to use end_date for past/upcoming logic
function Dashboard({ route = '' }) {
  try {
    const authContext = React.useContext(window.AuthContext || React.createContext({}));
    const { user, session, loading: authLoading, requireAuth } = authContext;
    const [events, setEvents] = React.useState([]);
    const [collaborativeEvents, setCollaborativeEvents] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [loadingCollaborative, setLoadingCollaborative] = React.useState(true);
    const [respondingTo, setRespondingTo] = React.useState(null);
    const [activeTab, setActiveTab] = React.useState('events');
    const [unreadNotifications, setUnreadNotifications] = React.useState(0);
    const [pendingInvitationsCount, setPendingInvitationsCount] = React.useState(0);

    // Session guard - redirect if not authenticated
    React.useEffect(() => {
      if (requireAuth && !requireAuth()) {
        return;
      }
    }, [requireAuth]);

    React.useEffect(() => {
      if (!authLoading && user?.id && window.supabaseClient) {
        loadDashboardData();
        
        // Check for pending invitation processing
        const pendingToken = localStorage.getItem('pending_invitation_token');
        const pendingAction = localStorage.getItem('pending_invitation_action');
        
        if (pendingToken && pendingAction === 'collaborator-invite-response') {
          // Clear stored data and redirect to invitation processing
          localStorage.removeItem('pending_invitation_token');
          localStorage.removeItem('pending_invitation_action');
          
          setTimeout(() => {
            window.location.href = `#/collaborator-invite-response?invitation=${pendingToken}`;
          }, 1000);
        }
      } else if (!authLoading && !user) {
        setLoading(false);
        setLoadingCollaborative(false);
      }
    }, [user?.id, authLoading]);

    // Add event listeners for real-time updates
    React.useEffect(() => {
        const refetchAll = () => {
            loadUserEvents();
            loadCollaborativeEvents();
            loadUnreadNotifications();
        };

        const handleNotificationUpdate = () => {
            // Dashboard: notificationRead event received, refreshing counter
            // Add a small delay to ensure database update has completed
            setTimeout(() => {
                loadUnreadNotifications();
            }, 100);
        };

        if (window.EventBus) {
            window.EventBus.on(window.EventBus.INVITATIONS_UPDATED, refetchAll);
            window.EventBus.on(window.EventBus.INVITATION_ACCEPTED, refetchAll);
            window.EventBus.on(window.EventBus.COLLABORATOR_UPDATED, refetchAll);
            window.EventBus.on(window.EventBus.EVENTS_UPDATED, refetchAll);
            window.EventBus.on(window.EventBus.DASHBOARD_REFRESH, refetchAll);

            return () => {
                window.EventBus.off(window.EventBus.INVITATIONS_UPDATED, refetchAll);
                window.EventBus.off(window.EventBus.INVITATION_ACCEPTED, refetchAll);
                window.EventBus.off(window.EventBus.COLLABORATOR_UPDATED, refetchAll);
                window.EventBus.off(window.EventBus.EVENTS_UPDATED, refetchAll);
                window.EventBus.off(window.EventBus.DASHBOARD_REFRESH, refetchAll);
            };
        }

        // Also listen for direct notification events
        window.addEventListener('notificationCreated', handleNotificationUpdate);
        window.addEventListener('notificationRead', handleNotificationUpdate);
        window.addEventListener('collaboratorInvited', handleNotificationUpdate);
        
        // Listen for navigation refresh events (when user clicks Dashboard while on dashboard)
        const handleNavigationRefresh = (event) => {
            if (event.detail?.forceRefresh) {
                refetchAll();
            }
        };
        window.addEventListener('navigationRefresh', handleNavigationRefresh);

        return () => {
            window.removeEventListener('notificationCreated', handleNotificationUpdate);
            window.removeEventListener('notificationRead', handleNotificationUpdate);
            window.removeEventListener('collaboratorInvited', handleNotificationUpdate);
            window.removeEventListener('navigationRefresh', handleNavigationRefresh);
        };
    }, []);

    const loadUnreadNotifications = async () => {
      try {
        const session = await window.getSessionWithRetry?.(3, 150);
        if (!session?.user?.id) {
          // Dashboard: No session, setting unread to 0
          setUnreadNotifications(0);
          return;
        }

        // Dashboard: Loading unread notifications for user
        
        // Get unread notifications from notifications table
        const { data: notifications, error: notificationsError } = await window.supabaseClient
          .from('notifications')
          .select('id, type, title, read_status')
          .eq('user_id', session.user.id)
          .eq('read_status', false);

        if (notificationsError) {
          console.error('❌ Dashboard: Error loading notifications:', notificationsError);
        }

        // Dashboard: Regular notifications query result

        // Get unread collaborator invitations
        const { data: unreadInvitations, error: invitationsError } = await window.supabaseClient
          .from('event_collaborator_invitations')
          .select('id, event_id, email, role, created_at, read_status')
          .eq('email', session.user.email)
          .eq('status', 'pending')
          .eq('read_status', false);

        if (invitationsError) {
          console.error('❌ Dashboard: Error loading pending invitations:', invitationsError);
        }

        // Dashboard: Unread invitations query result

        // Calculate total unread count
        const notificationsCount = notifications?.length || 0;
        const unreadInvitationsCount = unreadInvitations?.length || 0;
        const totalUnread = notificationsCount + unreadInvitationsCount;

        // Dashboard: Found notifications and unread invitations
        setUnreadNotifications(totalUnread);
        setPendingInvitationsCount(unreadInvitationsCount);
      } catch (error) {
        console.error('❌ Dashboard: Exception in loadUnreadNotifications:', error);
        setUnreadNotifications(0);
        setPendingInvitationsCount(0);
      }
    };

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setLoadingCollaborative(true);
        
        await loadEvents();
        setLoading(false);
        
        await Promise.all([
          loadCollaborativeEvents(),
          loadUnreadNotifications()
        ]);
        
        setLoadingCollaborative(false);
      } catch (error) {
        setLoading(false);
        setLoadingCollaborative(false);
      }
    };

    const loadEvents = async () => {
      try {
        // Ensure we have a valid session before making queries
        const session = await window.getSessionWithRetry?.(3, 150);
        if (!session?.user?.id) {
          setEvents([]);
          return;
        }
        
        let events = [];
        try {
          // Only load events where the user is the actual owner (created_by OR user_id)
          // This excludes collaborative events where user only has a role
          const { data, error } = await window.supabaseClient
            .from('events')
            .select('id, name, start_date, end_date, location, status, created_at, created_by, user_id, event_schedule')
            .or(`created_by.eq.${session.user.id},user_id.eq.${session.user.id}`)
            .order('created_at', { ascending: false })
            .limit(10);
          
          if (error) {
            if (error.message && error.message.includes('infinite recursion')) {
              setEvents([]);
              return;
            }
            throw error;
          }
          
          // Filter to ensure we only show events where user is actually the owner
          // (not just a collaborator with a role)
          events = (data || []).filter(event => 
            event.created_by === session.user.id || event.user_id === session.user.id
          );
          
        } catch (error) {
          events = [];
        }
        
        setEvents(events);
      } catch (error) {
        setEvents([]);
      }
    };

    // Alias for backward compatibility
    const loadUserEvents = loadEvents;



    const loadCollaborativeEvents = async () => {
      // Dashboard loadCollaborativeEvents called
      try {
        
        if (!window.collaboratorAPI?.getCollaborativeEvents) {
          console.log('❌ collaboratorAPI.getCollaborativeEvents not available');
          setCollaborativeEvents([]);
          return;
        }

        let events = [];
        try {
          console.log('📞 Calling collaboratorAPI.getCollaborativeEvents...');
          console.log('🔍 collaboratorAPI object:', window.collaboratorAPI);
          console.log('🔍 getCollaborativeEvents function:', window.collaboratorAPI?.getCollaborativeEvents);
          const collaborativeData = await window.collaboratorAPI.getCollaborativeEvents();
          
          // The API returns events in format: { event: {...}, role: '...', status: '...' }
          events = collaborativeData || [];
          
        } catch (error) {
          if (error.message && error.message.includes('infinite recursion')) {
            events = [];
          } else {
            events = [];
          }
        }
        
        console.log('📊 Setting collaborativeEvents:', events?.length || 0, events);
        setCollaborativeEvents(events || []);
      } catch (error) {
        console.log('❌ Error in loadCollaborativeEvents:', error);
        setCollaborativeEvents([]);
      }
    };

    // loadPendingInvitations function removed - collaborator invitations now handled by unified notification system

    const calculateDaysToGo = (startDate) => {
      if (!startDate) return null;
      const today = new Date();
      const eventDate = new Date(startDate);
      const timeDiff = eventDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      if (daysDiff < 0) return { text: 'Past event', color: 'bg-gray-100 text-gray-800' };
      if (daysDiff === 0) return { text: 'Today', color: 'bg-red-100 text-red-800' };
      if (daysDiff === 1) return { text: '1 day', color: 'bg-yellow-100 text-yellow-800' };
      if (daysDiff <= 7) return { text: `${daysDiff} days`, color: 'bg-yellow-100 text-yellow-800' };
      return { text: `${daysDiff} days`, color: 'bg-green-100 text-green-800' };
    };

    // Show loading while auth is initializing
    if (authLoading) {
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
        }, 'Loading dashboard...')
      ]));
    }

    // Show auth required message if no session
    if (!authLoading && !session?.user) {
      return React.createElement('div', {
        className: 'min-h-screen flex items-center justify-center bg-gray-50'
      }, React.createElement('div', {
        className: 'text-center'
      }, [
        React.createElement('div', {
          key: 'icon',
          className: 'w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'
        }, React.createElement('div', {
          className: 'icon-alert-circle text-2xl text-red-600'
        })),
        React.createElement('h2', {
          key: 'title',
          className: 'text-xl font-semibold text-gray-900 mb-2'
        }, 'Session Expired'),
        React.createElement('p', {
          key: 'description',
          className: 'text-gray-600 mb-6'
        }, 'Your session has expired. Please sign in again.'),
        React.createElement('a', {
          key: 'login-btn',
          href: '#/login',
          className: 'inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors'
        }, 'Sign In')
      ]));
    }

    return React.createElement('div', {
      className: 'min-h-screen bg-gray-50'
    }, [
      // Header
      React.createElement('div', {
        key: 'header',
        className: 'bg-white border-b'
      }, React.createElement('div', {
        className: 'container mx-auto mobile-spacing py-4 sm:py-6'
      }, React.createElement('div', {
        className: 'flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0'
      }, [
        React.createElement('div', {
          key: 'title-section',
          className: 'text-center sm:text-left'
        }, [
          React.createElement('h1', {
            key: 'title',
            className: 'text-2xl sm:text-3xl font-bold text-gray-900'
          }, 'Dashboard'),
          React.createElement('p', {
            key: 'subtitle',
            className: 'text-gray-600 mt-1 text-sm sm:text-base'
          }, 'Manage your events and collaborations')
        ]),
        React.createElement('div', {
          key: 'actions',
          className: 'flex justify-center sm:justify-end'
        }, [
          React.createElement('a', {
            key: 'create-event',
            href: '#/event-form',
            className: 'px-3 py-2 sm:px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm sm:text-base flex items-center justify-center'
          }, [
            React.createElement('div', {
              key: 'icon',
              className: 'icon-plus text-sm mr-2'
            }),
            React.createElement('span', {
              key: 'text'
            }, 'Create New Event')
          ])
        ])
      ]))),
      
        // Content
        React.createElement('div', {
          key: 'content',
          className: 'container mx-auto px-4 py-6'
        }, [
          // Stats
          React.createElement('div', {
            key: 'stats',
            className: 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6 sm:mb-8 mobile-spacing'
          }, [
            React.createElement('div', {
              key: 'events-stat',
              className: 'bg-white overflow-hidden shadow rounded-lg'
            }, React.createElement('div', {
              className: 'p-5'
            }, React.createElement('div', {
              className: 'flex items-center'
            }, [
              React.createElement('div', {
                key: 'icon',
                className: 'flex-shrink-0'
              }, React.createElement('div', {
                className: 'icon-calendar text-xl text-indigo-600'
              })),
              React.createElement('div', {
                key: 'content',
                className: 'ml-5 w-0 flex-1'
              }, React.createElement('dl', {}, [
                React.createElement('dt', {
                  key: 'label',
                  className: 'text-sm font-medium text-gray-500 truncate'
                }, 'Events I Created'),
                React.createElement('dd', {
                  key: 'value',
                  className: 'text-lg font-medium text-gray-900'
                }, events.length)
              ]))
            ]))),

            React.createElement('div', {
              key: 'collaborative-stat',
              className: 'bg-white overflow-hidden shadow rounded-lg'
            }, React.createElement('div', {
              className: 'p-5'
            }, React.createElement('div', {
              className: 'flex items-center'
            }, [
              React.createElement('div', {
                key: 'icon',
                className: 'flex-shrink-0'
              }, React.createElement('div', {
                className: 'icon-users text-xl text-orange-600'
              })),
              React.createElement('div', {
                key: 'content',
                className: 'ml-5 w-0 flex-1'
              }, React.createElement('dl', {}, [
                React.createElement('dt', {
                  key: 'label',
                  className: 'text-sm font-medium text-gray-500 truncate'
                }, 'Events I\'m Collaborating On'),
                React.createElement('dd', {
                  key: 'value',
                  className: 'text-lg font-medium text-gray-900'
                }, (() => {
                  // Count upcoming collaborative events only
                  const currentDate = new Date();
                  const upcomingCollaborative = collaborativeEvents.filter(collab => {
                    const eventDate = collab.event?.end_date || collab.event?.start_date || collab.event?.date;
                    return eventDate && new Date(eventDate) >= currentDate;
                  });
                  return upcomingCollaborative.length;
                })())
              ]))
            ]))),
            React.createElement('div', {
              key: 'pending-stat',
              className: 'bg-white overflow-hidden shadow rounded-lg'
            }, React.createElement('div', {
              className: 'p-5'
            }, React.createElement('div', {
              className: 'flex items-center'
            }, [
              React.createElement('div', {
                key: 'icon',
                className: 'flex-shrink-0'
              }, React.createElement('div', {
                className: 'icon-clock text-xl text-red-600'
              })),
              React.createElement('div', {
                key: 'content',
                className: 'ml-5 w-0 flex-1'
              }, React.createElement('dl', {}, [
                React.createElement('dt', {
                  key: 'label',
                  className: 'text-sm font-medium text-gray-500 truncate'
                }, 'Pending Invitations'),
                React.createElement('dd', {
                  key: 'value',
                  className: 'text-lg font-medium text-gray-900'
                }, pendingInvitationsCount)
              ]))
            ])))
          ]),
          
          // Tabs - Mobile optimized
          React.createElement('div', {
            key: 'tabs',
            className: 'border-b border-gray-200 mb-6 sm:mb-8'
          }, React.createElement('div', {
            className: 'mobile-spacing'
          }, React.createElement('nav', {
            className: '-mb-px flex space-x-2 sm:space-x-8 overflow-x-auto'
          }, [
            React.createElement('button', {
              key: 'events-tab',
              onClick: () => setActiveTab('events'),
              className: `py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap touch-target ${
                activeTab === 'events'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`
            }, React.createElement('div', {
              className: 'flex items-center'
            }, [
              React.createElement('div', {
                key: 'icon',
                className: 'icon-calendar text-sm mr-1 sm:mr-2'
              }),
              React.createElement('span', {
                key: 'desktop-text',
                className: 'hidden sm:inline'
              }, `Events I Created (${events.length})`),
              React.createElement('span', {
                key: 'mobile-text', 
                className: 'sm:hidden'
              }, `Created (${events.length})`)
            ])),

            React.createElement('button', {
              key: 'collaborative-tab',
              onClick: () => setActiveTab('collaborative'),
              className: `py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap touch-target ${
                activeTab === 'collaborative'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`
            }, React.createElement('div', {
              className: 'flex items-center'
            }, [
              React.createElement('div', {
                key: 'icon',
                className: 'icon-users text-sm mr-1 sm:mr-2'
              }),
              React.createElement('span', {
                key: 'desktop-text',
                className: 'hidden sm:inline'
              }, `Events I'm Collaborating On (${collaborativeEvents.length})`),
              React.createElement('span', {
                key: 'mobile-text',
                className: 'sm:hidden'
              }, `Collaborating (${collaborativeEvents.length})`)
            ])),
            React.createElement('button', {
              key: 'notifications-tab',
              onClick: () => setActiveTab('notifications'),
              className: `py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap touch-target ${
                activeTab === 'notifications'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`
            }, React.createElement('div', {
              className: 'flex items-center'
            }, [
              React.createElement('div', {
                key: 'icon',
                className: 'icon-bell text-sm mr-1 sm:mr-2'
              }),
              React.createElement('span', {
                key: 'desktop-text',
                className: 'hidden sm:inline'
              }, `Notifications${unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}`),
              React.createElement('span', {
                key: 'mobile-text',
                className: 'sm:hidden'
              }, `Notify${unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}`)
            ])),

          ]))),
          
          
          // Tab Content
          React.createElement('div', {
            key: 'tab-content'
          }, (() => {
            if (activeTab === 'events') {
              return React.createElement('div', { className: 'space-y-8' }, [
                // My Events Section
                window.EventsSection ? React.createElement(window.EventsSection, {
                  key: 'my-events',
                  events,
                  onDeleteEvent: async (eventId) => {
                    console.log('Delete event requested for ID:', eventId); // Debug log
                    
                    if (!confirm('Are you sure you want to delete this event? This action cannot be undone and will remove the event from all collaborators.')) {
                      console.log('Delete cancelled by user'); // Debug log
                      return;
                    }
                    
                    try {
                      console.log('Attempting to delete event:', eventId); // Debug log
                      
                      // Use the proper deleteEvent function from the API
                      const success = await window.deleteEvent(eventId);
                      
                      if (success) {
                        console.log('Event deleted successfully, updating UI'); // Debug log
                        
                        // Remove from local state
                        setEvents(prevEvents => prevEvents.filter(e => e.id !== eventId));
                        
                        // Also remove from collaborative events if it exists there
                        setCollaborativeEvents(prevEvents => prevEvents.filter(e => e.id !== eventId));
                        
                        // Show success message
                        if (window.showToast) {
                          window.showToast('Event deleted successfully', 'success');
                        } else if (window.toast) {
                          window.toast.success('Event deleted successfully');
                        }
                        
                        // Refresh the events list to ensure consistency
                        loadEvents();
                        loadCollaborativeEvents();
                      } else {
                        throw new Error('Delete operation returned false');
                      }
                    } catch (error) {
                      console.error('Error deleting event:', error); // Debug log
                      const errorMessage = error.message || 'Failed to delete event';
                      
                      if (window.showToast) {
                        window.showToast(`Error: ${errorMessage}`, 'error');
                      } else if (window.toast) {
                        window.toast.error(`Error: ${errorMessage}`);
                      } else {
                        alert(`Error deleting event: ${errorMessage}`);
                      }
                    }
                  },
                  loading
                }) : React.createElement('div', { 
                  key: 'no-events', 
                  className: 'p-4 text-gray-500' 
                }, 'Events component not loaded'),
                
                // Collaborative Events Section removed - handled in collaborative tab to prevent duplication
              ]);
            }
            
            if (activeTab === 'collaborative') {
              return React.createElement('div', {
                className: 'space-y-8'
              }, [
                // Pending invitations are now handled by the unified notification system
                // They appear in the main Notifications tab, not here
                
                // Collaborative events section
                window.AssignedEventsSection ? React.createElement(window.AssignedEventsSection, {
                  key: 'collaborative-events',
                  collaborativeEvents,
                  loadingAssigned: loadingCollaborative,
                  calculateDaysToGo
                }) : React.createElement('div', { 
                  key: 'no-collaborative',
                  className: 'bg-white rounded-lg shadow p-6 text-center text-gray-500'
                }, [
                  React.createElement('div', {
                    key: 'icon',
                    className: 'icon-users text-4xl text-gray-300 mb-4'
                  }),
                  React.createElement('p', { key: 'text' }, 'No collaborative events available')
                ])
              ]);
            }
            
            if (activeTab === 'notifications') {
              return window.NotificationsSection ? React.createElement(window.NotificationsSection, {
                key: 'notifications-section'
              }) : React.createElement('div', {
                className: 'bg-white rounded-lg shadow border border-gray-200 p-8'
              }, [
                React.createElement('div', {
                  key: 'content',
                  className: 'text-center text-gray-500'
                }, [
                  React.createElement('div', {
                    key: 'icon',
                    className: 'icon-bell text-4xl text-gray-300 mb-4'
                  }),
                  React.createElement('h3', {
                    key: 'title',
                    className: 'text-lg font-medium text-gray-900 mb-2'
                  }, 'Notifications'),
                  React.createElement('p', {
                    key: 'description'
                  }, 'System notifications and updates will appear here.')
                ])
              ]);
            }
            
            
            return null;
          })())
        ])
    ]);
  } catch (error) {
    return React.createElement('div', {
      className: 'p-8 text-center'
    }, 'Dashboard error occurred');
  }
}

window.Dashboard = Dashboard;
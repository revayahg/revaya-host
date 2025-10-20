// PendingInvitations - Updated 2025-01-04 - Fixed to use end_date for date display
function PendingInvitations({ 
    pendingInvitations = [], 
    onInvitationResponse, 
    respondingTo, 
    calculateDaysToGo,
    loading = false
}) {
    const [localInvitations, setLocalInvitations] = React.useState(pendingInvitations);
    const [accepting, setAccepting] = React.useState(new Set());
    const authContext = React.useContext(window.AuthContext || React.createContext({}));
    const { user } = authContext;

    // Update local state when props change
    React.useEffect(() => {
        setLocalInvitations(pendingInvitations);
    }, [pendingInvitations]);

    // Hydrate invitations that are missing event details
    React.useEffect(() => {
        const hydrateInvitations = async () => {
            if (!localInvitations || localInvitations.length === 0) return;
            
            // Find invitations missing event details
            const missingEventIds = localInvitations
                .filter(inv => !inv.events && !inv.event)
                .map(inv => inv.event_id)
                .filter((id, index, arr) => arr.indexOf(id) === index); // unique
            
            if (missingEventIds.length === 0) return;
            
            try {
                const { data: events } = await window.supabaseClient
                    .from('events')
                    .select('id, name, title, start_date, location')
                    .in('id', missingEventIds);
                
                if (events && events.length > 0) {
                    setLocalInvitations(prev => prev.map(inv => {
                        if (!inv.events && !inv.event) {
                            const eventData = events.find(e => e.id === inv.event_id);
                            if (eventData) {
                                return { ...inv, events: eventData };
                            }
                        }
                        return inv;
                    }));
                }
            } catch (error) {
            }
        };
        
        hydrateInvitations();
    }, [localInvitations]);

    // Subscribe to invitation updates
    React.useEffect(() => {
        const handleInvitationUpdate = () => {
            // Refresh invitations when event is emitted
            if (onInvitationResponse) {
                onInvitationResponse();
            }
        };

        if (window.EventBus) {
            window.EventBus.on(window.EventBus.INVITATIONS_UPDATED, handleInvitationUpdate);
            
            return () => {
                window.EventBus.off(window.EventBus.INVITATIONS_UPDATED, handleInvitationUpdate);
            };
        }
    }, [onInvitationResponse]);

    const acceptInvitation = async (invitation) => {
        if (!user) return;

        const token = invitation.invitation_token;
        if (!token) {
            window.showToast && window.showToast('Invalid invitation token', 'error');
            return;
        }

        try {
            setAccepting(prev => new Set([...prev, token]));
            
            console.log('🎫 PendingInvitations: Accepting invitation with token:', token);
            
            // Use the proper API function that handles email notifications
            const response = await window.collaboratorAPI.acceptInvitationByToken(token);
            
            if (response && response.success) {
                // Success! Update UI optimistically and emit events
                window.showToast && window.showToast('Invitation accepted successfully!', 'success');
                
                // Optimistically remove the accepted invitation from local state
                setLocalInvitations(prev => prev.filter(inv => inv.invitation_token !== token));
                
                // Emit event bus signals for other components to update
                if (window.EventBus) {
                    window.EventBus.emit(window.EventBus.INVITATIONS_UPDATED, { token });
                    window.EventBus.emit(window.EventBus.COLLABORATOR_UPDATED, { eventId: invitation.event_id });
                    window.EventBus.emit(window.EventBus.EVENTS_UPDATED);
                    window.EventBus.emit(window.EventBus.DASHBOARD_REFRESH);
                    window.EventBus.emit(window.EventBus.INVITATION_ACCEPTED, { eventId: invitation.event_id });
                }

                // Call the callback to refresh the parent component
                if (onInvitationResponse) {
                    onInvitationResponse(token, 'accepted');
                }
            } else {
                const errorMsg = response?.error || 'Failed to accept invitation';
                window.showToast && window.showToast(errorMsg, 'error');
            }

        } catch (error) {
            console.error('Error accepting invitation:', error);
            window.showToast && window.showToast('Failed to accept invitation', 'error');
        } finally {
            setAccepting(prev => {
                const newSet = new Set(prev);
                newSet.delete(token);
                return newSet;
            });
        }
    };

    try {
        // Use local invitations for rendering
        const invitationsToShow = localInvitations || [];
        
        // Don't render anything if there are no invitations and not loading
        if (!loading && invitationsToShow.length === 0) {
            return null;
        }

        if (loading) {
            return React.createElement('div', {
                className: 'mb-8',
                'data-name': 'pending-invitations'
            }, React.createElement('div', {
                className: 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 shadow-sm'
            }, [
                React.createElement('div', {
                    key: 'header',
                    className: 'flex items-center mb-4'
                }, [
                    React.createElement('div', {
                        key: 'icon-container',
                        className: 'w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3'
                    }, React.createElement('div', {
                        className: 'icon-mail text-blue-600'
                    })),
                    React.createElement('h2', {
                        key: 'title',
                        className: 'text-lg font-medium text-gray-900'
                    }, 'Pending Collaboration Invitations')
                ]),
                React.createElement('div', {
                    key: 'loading',
                    className: 'text-center py-4'
                }, [
                    React.createElement('div', {
                        key: 'spinner',
                        className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2'
                    }),
                    React.createElement('p', {
                        key: 'text',
                        className: 'text-gray-500'
                    }, 'Loading invitations...')
                ])
            ]));
        }

        return React.createElement('div', {
            className: 'mb-8',
            'data-name': 'pending-invitations'
        }, React.createElement('div', {
            className: 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 shadow-sm'
        }, [
            React.createElement('div', {
                key: 'header',
                className: 'flex items-center mb-4'
            }, [
                React.createElement('div', {
                    key: 'icon-container',
                    className: 'w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3'
                }, React.createElement('div', {
                    className: 'icon-mail text-blue-600'
                })),
                React.createElement('h2', {
                    key: 'title',
                    className: 'text-lg font-medium text-gray-900'
                }, 'Pending Collaboration Invitations')
            ]),
            React.createElement('div', {
                key: 'invitations-list',
                className: 'space-y-4'
            }, invitationsToShow.map(invitation => {
                const event = invitation.events || invitation.event;
                if (!event) {
                    return null;
                }
                
                const daysToGo = calculateDaysToGo ? calculateDaysToGo(event.end_date || event.start_date || event.date) : null;
                const isResponding = accepting.has(invitation.invitation_token);
                
                return React.createElement('div', {
                    key: invitation.id,
                    className: 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm'
                }, [
                    React.createElement('div', {
                        key: 'header',
                        className: 'flex justify-between items-start mb-3'
                    }, [
                        React.createElement('div', {
                            key: 'event-info'
                        }, [
                            React.createElement('h3', {
                                key: 'event-name',
                                className: 'text-base font-medium text-gray-900'
                            }, event.title || event.name || 'Unnamed Event'),
                            React.createElement('p', {
                                key: 'event-details',
                                className: 'text-sm text-gray-600'
                            }, (() => {
                                const date = (event.end_date || event.date || event.start_date) ? new Date(event.start_date || event.date || event.end_date).toLocaleDateString() : 'Date TBD';
                                const location = event.location || 'Location TBD';
                                return `${date} • ${location}`;
                            })()),
                            React.createElement('p', {
                                key: 'role-info',
                                className: 'text-sm text-gray-500 mt-1'
                            }, `Role: ${invitation.role || 'Collaborator'} • Invited by: ${invitation.invited_by_name || 'Event organizer'}`)
                        ]),
                        daysToGo ? React.createElement('span', {
                            key: 'days-badge',
                            className: `text-xs font-medium px-2 py-1 rounded-full ${daysToGo.color}`
                        }, daysToGo.text) : null
                    ]),
                    React.createElement('div', {
                        key: 'actions',
                        className: 'flex space-x-3'
                    }, [
                        React.createElement('button', {
                            key: 'accept',
                            onClick: () => acceptInvitation(invitation),
                            disabled: isResponding,
                            className: 'px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2'
                        }, [
                            React.createElement('div', {
                                key: 'icon',
                                className: 'icon-check text-sm'
                            }),
                            React.createElement('span', {
                                key: 'text'
                            }, isResponding ? 'Processing...' : 'Accept')
                        ]),
                        React.createElement('button', {
                            key: 'decline',
                            onClick: async () => {
                                if (window.collaboratorAPI?.cancelInvitation) {
                                    try {
                                        await window.collaboratorAPI.cancelInvitation(invitation.event_id, invitation.id);
                                        window.showToast && window.showToast('Invitation declined', 'info');
                                        // Optimistically remove from local state
                                        setLocalInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
                                        // Emit events
                                        if (window.EventBus) {
                                            window.EventBus.emit(window.EventBus.INVITATIONS_UPDATED);
                                            window.EventBus.emit(window.EventBus.DASHBOARD_REFRESH);
                                        }
                                    } catch (error) {
                                        window.showToast && window.showToast('Failed to decline invitation', 'error');
                                    }
                                }
                            },
                            disabled: isResponding,
                            className: 'px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 flex items-center space-x-2'
                        }, [
                            React.createElement('div', {
                                key: 'icon',
                                className: 'icon-x text-sm'
                            }),
                            React.createElement('span', {
                                key: 'text'
                            }, isResponding ? 'Processing...' : 'Decline')
                        ])
                    ])
                ]);
            }).filter(Boolean))
        ]));
    } catch (error) {
        return React.createElement('div', {
            className: 'mt-8 p-4 bg-red-50 border border-red-200 rounded-lg'
        }, [
            React.createElement('h3', {
                key: 'error-title',
                className: 'text-red-800 font-medium'
            }, 'Error Loading Invitations'),
            React.createElement('p', {
                key: 'error-message',
                className: 'text-red-600 text-sm mt-1'
            }, 'There was an issue loading your pending invitations.')
        ]);
    }
}

window.PendingInvitations = PendingInvitations;

// Also export for potential named imports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PendingInvitations;
}

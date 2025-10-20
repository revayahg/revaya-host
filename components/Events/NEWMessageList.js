function NEWMessageList({ messages = [], loading = false, currentUser, vendorProfiles = [], selectedVendorId, vendorProfileId, currentVendorId }) {
    try {
        // Create a map for faster vendor profile lookups
        const vendorProfilesMap = React.useMemo(() => {
            const map = {};
            vendorProfiles.forEach(vendor => {
                if (vendor.id || vendor.vendorProfileId) {
                    map[vendor.id || vendor.vendorProfileId] = vendor;
                }
            });
            return map;
        }, [vendorProfiles]);

        const isCurrentUserMessage = (msg) => {
            if (!currentUser || !msg) return false;
            
                messageId: msg.id,
                senderUserId: msg.sender_id,
                senderVendorProfileId: msg.sender_vendor_profile_id,
                currentUserId: currentUser.id,
                currentVendorId: currentVendorId,
                vendorProfileId: vendorProfileId,
                isVendorView: !!currentVendorId
            });
            
            // CRITICAL FIX: If we have a currentVendorId (viewing from vendor perspective)
            if (currentVendorId) {
                // This message is mine if it was sent by my vendor profile
                const isMine = msg.sender_vendor_profile_id === currentVendorId;
                return isMine;
            }
            
            // If we have a vendorProfileId context (viewing specific vendor thread from planner view)
            if (vendorProfileId) {
                // This message is mine if it was sent by the planner (no vendor profile) and I'm the event planner
                const isMine = !msg.sender_vendor_profile_id && msg.sender_id === currentUser.id;
                return isMine;
            }
            
            // Default: message is mine if sender_id matches and no vendor profile (planner message)
            const isMine = msg.sender_id === currentUser.id && !msg.sender_vendor_profile_id;
            return isMine;
        };

        const getSenderLabel = (msg) => {
            if (!msg) return 'Unknown';
            
            // Handle system messages
            if (msg.sender_type === 'system') {
                return 'System';
            }
            
            // Check if this message is from the current user
            if (isCurrentUserMessage(msg)) {
                return 'You';
            }
            
            // If it's from a vendor profile, show vendor name
            if (msg.sender_vendor_profile_id) {
                const vendor = vendorProfilesMap[msg.sender_vendor_profile_id];
                return vendor?.company || vendor?.name || 'Vendor';
            }
            
            // If it's from event planner (no vendor profile)
            if (msg.sender_type === 'planner' || !msg.sender_vendor_profile_id) {
                return 'Event Planner';
            }
            
            return 'Unknown Sender';
        };

        const getSenderNameForDisplay = (msg) => {
            if (!msg) return 'Unknown';
            
            // If it's from a vendor profile, show vendor name
            if (msg.sender_vendor_profile_id) {
                const vendor = vendorProfilesMap[msg.sender_vendor_profile_id];
                return vendor?.company || vendor?.name || 'Vendor';
            }
            
            // If it's from event planner (no vendor profile), find the event planner name
            const eventPlanner = vendorProfiles?.find(v => v.isPlanner);
            if (eventPlanner) {
                return eventPlanner.company || eventPlanner.name || 'Event Planner';
            }
            
            return 'Event Planner';
        };

        const isSystemMessage = (msg) => {
            return msg.sender_type === 'system';
        };

        if (loading) {
            return React.createElement('div', {
                className: 'flex-1 flex items-center justify-center p-8'
            }, [
                React.createElement('div', {
                    key: 'loading',
                    className: 'text-center'
                }, [
                    React.createElement('div', {
                        key: 'spinner',
                        className: 'icon-loader text-2xl text-blue-500 animate-spin mx-auto mb-2'
                    }),
                    React.createElement('p', {
                        key: 'text',
                        className: 'text-gray-500'
                    }, 'Loading messages...')
                ])
            ]);
        }

        if (!messages || messages.length === 0) {
            return React.createElement('div', {
                className: 'flex-1 flex items-center justify-center p-8'
            }, [
                React.createElement('div', {
                    key: 'empty',
                    className: 'text-center'
                }, [
                    React.createElement('div', {
                        key: 'icon',
                        className: 'icon-message-circle text-4xl text-gray-300 mx-auto mb-4'
                    }),
                    React.createElement('p', {
                        key: 'title',
                        className: 'text-gray-500 font-medium mb-2'
                    }, 'No messages yet'),
                    React.createElement('p', {
                        key: 'subtitle',
                        className: 'text-gray-400 text-sm'
                    }, 'Start the conversation by sending a message below')
                ])
            ]);
        }

        return React.createElement('div', {
            className: 'flex-1 p-4 space-y-3 overflow-y-auto'
        }, messages.map((message, index) => {
            const isMyMessage = isCurrentUserMessage(message);
            const isSystem = isSystemMessage(message);

            return React.createElement('div', {
                key: message.id,
                className: `w-full flex ${isSystem ? 'justify-center' : (isMyMessage ? 'justify-end' : 'justify-start')}`
            },
                    React.createElement('div', {
                        className: `max-w-xs lg:max-md px-4 py-2 ${
                            isSystem 
                                ? 'bg-yellow-100 text-yellow-800 text-center italic border border-yellow-200 rounded-xl'
                                : isMyMessage 
                                    ? 'bg-blue-500 text-white rounded-2xl rounded-br-md'
                                    : 'bg-gray-200 text-gray-800 rounded-2xl rounded-bl-md' 
                        }`
                    }, [
                        !isMyMessage && !isSystem && React.createElement('div', {
                            key: 'sender-name',
                            className: 'text-xs font-medium mb-1 text-gray-600'
                        }, getSenderNameForDisplay(message)),
                    React.createElement('div', {
                        key: 'content',
                        className: `text-sm leading-relaxed ${isSystem ? 'text-center' : ''}`
                    }, message.content),
                    React.createElement('div', {
                        key: 'timestamp',
                        className: `text-xs mt-1 ${
                            isSystem 
                                ? 'text-yellow-600 text-center'
                                : isMyMessage 
                                    ? 'text-blue-100 text-right' 
                                    : 'text-gray-500 text-left'
                        }`
                    }, new Date(message.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                    }))
                ])
            )
        }));
    } catch (error) {
        return React.createElement('div', {
            className: 'flex-1 flex items-center justify-center p-8'
        }, [
            React.createElement('div', {
                key: 'error',
                className: 'text-center text-red-600'
            }, 'Error loading messages')
        ]);
    }
}

window.NEWMessageList = NEWMessageList;

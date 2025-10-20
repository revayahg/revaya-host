function NEWEventMessagesPanel({ eventId, vendorProfileId, currentVendorId, userVendorProfile: propUserVendorProfile }) {
    try {
        const [messages, setMessages] = React.useState([]);
        const [loading, setLoading] = React.useState(true);
        const [assignedVendors, setAssignedVendors] = React.useState([]);
        const [selectedVendorId, setSelectedVendorId] = React.useState('all_participants');
        const { user: currentUser } = React.useContext(window.AuthContext);
        const [userVendorProfile, setUserVendorProfile] = React.useState(propUserVendorProfile || null);
        const messagesEndRef = React.useRef(null);
        const [vendorCache, setVendorCache] = React.useState(null);
        const [vendorLoadTime, setVendorLoadTime] = React.useState(null);

        const scrollToBottom = () => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
            }
        };

        React.useEffect(() => {
            scrollToBottom();
        }, [messages]);

        React.useEffect(() => {
            const checkUserVendorProfile = async () => {
                if (!propUserVendorProfile && currentUser) {
                    try {
                        // In VendorEventView context, we need to get the specific vendor profile
                        if (vendorProfileId && window.location.pathname.includes('/vendor-event/')) {
                            const { data: specificVendorProfile } = await window.supabaseClient
                                .from('vendor_profiles')
                                .select('*')
                                .eq('id', vendorProfileId)
                                .eq('user_id', currentUser.id)
                                .single();
                            
                            if (specificVendorProfile) {
                                setUserVendorProfile({ ...specificVendorProfile, isVendor: true });
                            }
                        } else if (window.getUserVendorProfiles) {
                            const profiles = await window.getUserVendorProfiles(currentUser.id);
                            setUserVendorProfile(profiles[0] || null);
                        }
                    } catch (error) {
                    }
                }
            };
            checkUserVendorProfile();
        }, [currentUser, propUserVendorProfile, vendorProfileId]);

        // Clean eventId following TaskManager pattern
        const cleanEventId = React.useMemo(() => {
            if (!eventId) return null;
            
            let cleaned = eventId.toString();
            if (cleaned.endsWith('/edit')) {
                cleaned = cleaned.replace('/edit', '');
            }
            cleaned = cleaned.split('?')[0];
            
            return cleaned;
        }, [eventId]);

        const loadAssignedVendors = async (useCache = true) => {
            // Use cache if available and less than 5 minutes old
            if (useCache && vendorCache && vendorLoadTime && (Date.now() - vendorLoadTime < 300000)) {
                setAssignedVendors(vendorCache);
                return;
            }

            try {
                
                let vendors = [];
                
                // Load event details to get event name
                const { data: eventData } = await window.supabaseClient
                    .from('events')
                    .select('name')
                    .eq('id', cleanEventId)
                    .single();

                const eventName = eventData?.name || 'Event Planner';
                
                // Always add event planner as first option for vendors
                if (vendorProfileId && userVendorProfile && userVendorProfile.isVendor) {
                    vendors.push({
                        id: 'event_planner',
                        vendorProfileId: 'event_planner',
                        name: eventName,
                        company: eventName,
                        email: '',
                        status: 'active',
                        response: 'active',
                        isPlanner: true
                    });
                    
                    // Add All Participants option for vendors
                    vendors.push({
                        id: 'all_participants',
                        vendorProfileId: 'all_participants',
                        name: 'All Event Participants',
                        company: 'All Event Participants',
                        email: '',
                        status: 'active',
                        response: 'active',
                        isGroup: true
                    });
                }
                
                // Load accepted event vendors with multiple fallbacks
                try {
                    let eventVendors = [];
                    
                    if (window.EventVendorAPI && typeof window.EventVendorAPI.getAcceptedEventVendors === 'function') {
                        eventVendors = await window.EventVendorAPI.getAcceptedEventVendors(cleanEventId);
                    } else {
                    }
                    
                    // If no vendors loaded, try alternative approaches
                    if (eventVendors.length === 0) {
                        
                        // Try event_vendors table first
                        try {
                            const { data: eventVendorData } = await window.supabaseClient
                                .from('event_vendors')
                                .select('vendor_id, vendor_name')
                                .eq('event_id', cleanEventId);
                            
                            if (eventVendorData && eventVendorData.length > 0) {
                                eventVendors = eventVendorData.map(item => ({
                                    vendor_profile_id: item.vendor_id,
                                    response: 'accepted',
                                    vendor_name: item.vendor_name || 'Vendor'
                                }));
                            }
                        } catch (eventVendorError) {
                        }
                        
                        // Try to get vendors from event_invitations with correct column names
                        if (eventVendors.length === 0) {
                            try {
                                const { data: inviteData } = await window.supabaseClient
                                    .from('event_invitations')
                                    .select('vendor_profile_id, response, vendor_name, vendor_email')
                                    .eq('event_id', cleanEventId);
                                
                                if (inviteData && inviteData.length > 0) {
                                    eventVendors = inviteData
                                        .filter(item => item.vendor_profile_id)
                                        .map(item => ({
                                            vendor_profile_id: item.vendor_profile_id,
                                            response: item.response || 'pending',
                                            vendor_name: item.vendor_name || 'Vendor',
                                            vendor_email: item.vendor_email
                                        }));
                                }
                            } catch (inviteError) {
                            }
                        }
                    }
                    
                    const vendorItems = eventVendors.map(item => ({
                        vendorProfileId: item.vendor_profile_id,
                        vendor_id: item.vendor_profile_id,
                        id: item.vendor_profile_id,
                        name: item.vendor_profiles?.company || item.vendor_profiles?.name || item.vendor_name || 'Unknown Vendor',
                        company: item.vendor_profiles?.company || item.vendor_name,
                        email: item.vendor_profiles?.email || '',
                        status: item.response || 'accepted',
                        response: item.response || 'accepted',
                        vendor_profiles: item.vendor_profiles,
                        isVendor: true
                    })).filter(vendor => vendor.vendorProfileId); // Filter out null IDs
                    
                    // For vendors viewing the panel, only show Event Planner and All Participants
                    if (vendorProfileId && userVendorProfile && userVendorProfile.isVendor) {
                        // Don't add individual vendors for vendor view
                    } else {
                        // For event planners, show all accepted vendors
                        vendors.push(...vendorItems);
                        
                        // Add All Participants option for event planners
                        vendors.push({
                            id: 'all_participants',
                            vendorProfileId: 'all_participants',
                            name: 'All Event Participants',
                            company: 'All Event Participants',
                            email: '',
                            status: 'active',
                            response: 'active',
                            isGroup: true
                        });
                    }
                    
                } catch (vendorError) {
                        message: vendorError.message,
                        details: vendorError.details,
                        hint: vendorError.hint,
                        code: vendorError.code
                    });
                    // Continue with empty vendor list
                }
                
                setAssignedVendors(vendors);
                
                // Cache the results
                setVendorCache(vendors);
                setVendorLoadTime(Date.now());
                
            } catch (error) {
                setAssignedVendors([]);
            }
        };

        const loadThreadMessages = async (vendorId) => {
            if (!vendorId || !cleanEventId) return;
            
            try {
                setLoading(true);
                
                // Pass the current vendor context to the API
                const threadMessages = await window.NEWMessageAPI.getThreadMessages(
                    cleanEventId, 
                    vendorId, 
                    currentVendorId || vendorProfileId
                );
                
                setMessages(threadMessages || []);
            } catch (error) {
                setMessages([]);
            } finally {
                setLoading(false);
            }
        };

        React.useEffect(() => {
            if (cleanEventId) {
                loadAssignedVendors();
            }
        }, [cleanEventId]);

        // Listen for vendor removal events
        React.useEffect(() => {
            const handleVendorRemoved = (event) => {
                if (event.detail.eventId === cleanEventId) {
                    loadAssignedVendors();
                    // Clear selection if removed vendor was selected
                    if (selectedVendorId === event.detail.vendorId) {
                        setSelectedVendorId('');
                    }
                }
            };

            window.addEventListener('vendorRemoved', handleVendorRemoved);
            return () => window.removeEventListener('vendorRemoved', handleVendorRemoved);
        }, [cleanEventId, selectedVendorId]);

        React.useEffect(() => {
            if (selectedVendorId) {
                loadThreadMessages(selectedVendorId);
            }
        }, [selectedVendorId, cleanEventId]);

        const handleVendorSelect = (vendorId) => {
            setSelectedVendorId(vendorId);
        };

        const handleMessageSent = async () => {
            if (selectedVendorId) {
                // Reload messages immediately, then again after a delay to catch any database lag
                await loadThreadMessages(selectedVendorId);
                setTimeout(async () => {
                    await loadThreadMessages(selectedVendorId);
                    scrollToBottom();
                }, 500);
            }
        };

        // Vendor-to-vendor messaging removed - simplified to planner and group only

        const getSelectedVendor = () => {
            return assignedVendors.find(v => v.id === selectedVendorId);
        };

        const getHeaderTitle = () => {
            if (selectedVendorId === 'all_participants') {
                return 'All Event Participants';
            }
            const selectedVendor = getSelectedVendor();
            if (userVendorProfile) {
                return selectedVendor ? selectedVendor.name : 'Event Planner';
            }
            return selectedVendor ? selectedVendor.name : 'Select a vendor';
        };

        const getHeaderSubtitle = () => {
            if (selectedVendorId === 'all_participants') {
                return 'Group chat with all event participants';
            }
            if (userVendorProfile) {
                return 'Event Discussion';
            }
            return selectedVendorId ? 'Chat with your assigned vendor' : 'Select a vendor to start chatting';
        };

        return React.createElement('div', {
            className: 'bg-white rounded-lg shadow border flex flex-col h-[600px]'
        }, [
            React.createElement('div', {
                key: 'header',
                className: 'flex items-center px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg'
            }, [
                React.createElement('div', {
                    key: 'header-content',
                    className: 'flex items-center space-x-3'
                }, [
                    React.createElement('div', {
                        key: 'avatar',
                        className: 'w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'
                    }, [
                        React.createElement('div', {
                            key: 'avatar-icon',
                            className: 'icon-user text-blue-600 text-sm'
                        })
                    ]),
                    React.createElement('div', {
                        key: 'title-info'
                    }, [
                        React.createElement('h3', {
                            key: 'title',
                            className: 'font-semibold text-gray-900 text-sm'
                        }, getHeaderTitle()),
                        React.createElement('p', {
                            key: 'subtitle',
                            className: 'text-xs text-gray-500'
                        }, getHeaderSubtitle())
                    ])
                ])
            ]),
            
            React.createElement('div', {
                key: 'messages',
                className: 'flex-1 overflow-y-auto bg-gray-50'
            }, [
            React.createElement(window.NEWMessageList, {
                key: 'message-list',
                messages: messages,
                loading: loading,
                currentUser: currentUser,
                vendorProfiles: assignedVendors || [],
                selectedVendorId: selectedVendorId,
                currentVendorId: currentVendorId || vendorProfileId,
                vendorProfileId: vendorProfileId
            }),
                React.createElement('div', {
                    key: 'messages-end',
                    ref: messagesEndRef
                })
            ]),
            
            React.createElement(window.NEWSendMessageForm, {
                key: 'send-form',
                eventId: cleanEventId,
                assignedVendors: assignedVendors,
                currentUser: currentUser,
                selectedVendorId: selectedVendorId,
                onVendorSelect: handleVendorSelect,
                onMessageSent: handleMessageSent,
                // Vendor-to-vendor messaging removed
                currentVendorProfileId: vendorProfileId || currentVendorId
            })
        ]);
    } catch (error) {
        return React.createElement('div', {
            className: 'p-6 text-center text-red-600'
        }, 'Error loading messages panel');
    }
}

window.NEWEventMessagesPanel = NEWEventMessagesPanel;
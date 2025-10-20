// NEW Event-Scoped Messaging API
// Simplified group chat model: event is the group, everyone can message within it

window.NEWMessageAPI = {
    // Get messaging recipients for an event using RPC function (with fallback)
    async getEventMessagingRecipients(eventId) {
        try {

            if (!window.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            // Try RPC first, fallback to direct query if RPC doesn't exist
            try {
                const { data, error } = await window.supabaseClient
                    .rpc('get_event_messaging_recipients', { p_event_id: eventId });

                if (error) {
                    return await this.getEventMessagingRecipientsDirectly(eventId);
                }

                return data || [];

            } catch (rpcError) {
                return await this.getEventMessagingRecipientsDirectly(eventId);
            }

        } catch (error) {
                error: error,
                eventId: eventIdStr,
                recipientId: recipientIdStr,
                threadSubject: threadSubject
            });
            throw error;
        }
    },

    // Test messaging access and permissions
    async testMessagingAccess() {
        try {
            const { data, error } = await window.supabaseClient.rpc('test_messaging_access');
            return data;
        } catch (error) {
            return null;
        }
    },

    // Send a message in event-scoped group chat
    async sendMessage(eventId, recipientVendorProfileId, content, subject = null) {
        try {

            if (!window.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            // Get current user
            const session = await window.getSessionWithRetry?.(3, 150);
            const user = session?.user;
            if (!user) {
                throw new Error('User not authenticated');
            }

            // CRITICAL FIX: Determine sender identity based on current context
            let senderVendorProfileId = null;
            let senderType = 'planner';

            // Check if user has vendor profiles
            const { data: vendorProfiles } = await window.supabaseClient
                .from('vendor_profiles')
                .select('id')
                .eq('user_id', user.id);


            // CRITICAL: Determine context properly based on URL structure
            if (window.location.hash.includes('/vendor-event/')) {
                // In vendor event view - extract vendor ID from hash
                const hashParts = window.location.hash.split('/');
                const eventPart = hashParts.find(part => part.includes('?vendor='));
                
                if (eventPart) {
                    const urlParams = new URLSearchParams(eventPart.split('?')[1]);
                    const vendorIdFromUrl = urlParams.get('vendor');
                    
                    
                    if (vendorIdFromUrl && vendorProfiles?.find(vp => vp.id === vendorIdFromUrl)) {
                        senderVendorProfileId = vendorIdFromUrl;
                        senderType = 'vendor';
                    }
                } else {
                    // Fallback: try to get vendor from the last part of the hash
                    const lastPart = hashParts[hashParts.length - 1];
                    if (lastPart && vendorProfiles?.find(vp => vp.id === lastPart)) {
                        senderVendorProfileId = lastPart;
                        senderType = 'vendor';
                    }
                }
            } else if (window.location.hash.includes('/event/edit/')) {
                // In event edit view - check for vendor context in URL params
                const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
                const vendorFromUrl = urlParams.get('vendor');
                
                if (vendorFromUrl && vendorProfiles?.find(vp => vp.id === vendorFromUrl)) {
                    senderVendorProfileId = vendorFromUrl;
                    senderType = 'vendor';
                } else {
                    // Default to planner in event edit view
                    senderVendorProfileId = null;
                    senderType = 'planner';
                }
            }

                senderVendorProfileId,
                senderType,
                currentUrl: window.location.hash
            });


            // Send message directly
            return await this.sendMessageDirectly(eventId, recipientVendorProfileId, content, senderVendorProfileId, senderType);

        } catch (error) {
                error: error,
                eventId: eventId,
                recipientVendorProfileId: recipientVendorProfileId,
                content: content
            });
            throw error;
        }
    },

    // Add group thread support
    async getGroupThread(eventId) {
        try {
            if (!window.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            const { data, error } = await window.supabaseClient
                .rpc('get_or_create_group_thread', {
                    p_event_id: String(eventId)
                });

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            throw error;
        }
    },

    // Send message directly - simplified group chat model
    async sendMessageDirectly(eventId, recipientVendorProfileId, content, senderVendorProfileId, senderType) {
        try {
                eventId, recipientVendorProfileId, content, senderVendorProfileId, senderType 
            });

            const session = await window.getSessionWithRetry?.(3, 150);
            const user = session?.user;
            if (!user) {
                throw new Error('User not authenticated');
            }

            const eventIdStr = String(eventId);
            let recipientIdStr = String(recipientVendorProfileId);

            // Find or create thread for this conversation
            let threadId;
            let threadSubject = 'Event Discussion';

            if (recipientIdStr === 'all_participants') {
                threadSubject = 'all_participants';
                recipientIdStr = 'all_participants';
            } else if (recipientIdStr === 'event_planner') {
                // For vendor -> planner messages, use vendor's profile ID as thread identifier
                recipientIdStr = senderVendorProfileId || 'event_planner';
                threadSubject = 'Event Discussion';
            }
            // Vendor-to-vendor messaging removed - vendors can only message planner and group

            // First try to find existing thread
            const { data: existingThread, error: findError } = await window.supabaseClient
                .from('message_threads')
                .select('id')
                .eq('event_id', eventIdStr)
                .eq('vendor_profile_id', recipientIdStr)
                .eq('subject', threadSubject)
                .maybeSingle();

            let threadData;
            let threadError;

            if (existingThread) {
                // Use existing thread
                threadData = existingThread;
            } else {
                // Create new thread
                const { data: newThread, error: createError } = await window.supabaseClient
                    .from('message_threads')
                    .insert({
                        event_id: eventIdStr,
                        vendor_profile_id: recipientIdStr,
                        subject: threadSubject,
                        is_active: true,
                        created_by: user.id
                    })
                    .select('id')
                    .single();
                
                threadData = newThread;
                threadError = createError;
            }

            if (threadError) {
                throw new Error(`Thread creation/retrieval failed: ${threadError.message}`);
            }

            if (!threadData || !threadData.id) {
                throw new Error('Thread operation completed but no ID returned');
            }

            threadId = threadData.id;

            // Insert message with event_id for proper queries
            const messageData = {
                thread_id: threadId,
                event_id: eventIdStr,
                sender_vendor_profile_id: senderVendorProfileId,
                content: content,
                sender_type: senderType,
                sender_id: user.id
            };


            const { data: message, error: messageError } = await window.supabaseClient
                .from('messages')
                .insert(messageData)
                .select('*')
                .single();

            if (messageError) {
                throw new Error(`Message creation failed: ${messageError.message || JSON.stringify(messageError)}`);
            }

            if (!message || !message.id) {
                throw new Error('Message created but no ID returned');
            }

            // Update thread timestamp
            await window.supabaseClient
                .from('message_threads')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', threadId);


            // Create notification for message recipients
            try {
                if (window.notificationAPI) {
                    if (recipientVendorProfileId === 'all_participants') {
                        // Notify all event participants
                        const recipients = await this.getEventMessagingRecipients(eventId);
                        for (const recipient of recipients) {
                            if (recipient.id !== senderVendorProfileId) {
                                const vendorUser = await this.getVendorUserId(recipient.id);
                                if (vendorUser) {
                                    await window.notificationAPI.createNotification({
                                        userId: vendorUser,
                                        type: 'message',
                                        title: 'New Group Message',
                                        message: `New message in event group chat`,
                                        eventId: eventId,
                                        relatedId: message.id
                                    });
                                }
                            }
                        }
                    } else if (recipientVendorProfileId === 'event_planner') {
                        // Notify event planner
                        const { data: event } = await window.supabaseClient
                            .from('events')
                            .select('user_id')
                            .eq('id', eventId)
                            .single();
                        
                        if (event && event.user_id !== user.id) {
                            await window.notificationAPI.createNotification({
                                userId: event.user_id,
                                type: 'message',
                                title: 'New Message',
                                message: `You have a new message from a vendor`,
                                eventId: eventId,
                                relatedId: message.id
                            });
                        }
                    } else {
                        // Notify specific vendor
                        const vendorUser = await this.getVendorUserId(recipientVendorProfileId);
                        if (vendorUser && vendorUser !== user.id) {
                            await window.notificationAPI.createNotification({
                                userId: vendorUser,
                                type: 'message',
                                title: 'New Message',
                                message: `You have a new message`,
                                eventId: eventId,
                                relatedId: message.id
                            });
                        }
                    }
                }
            } catch (notificationError) {
            }

            return message.id;

        } catch (error) {
            throw error;
        }
    },

    // Get message threads for an event (event-scoped)
    async getEventThreads(eventId) {
        try {

            if (!window.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            // Convert eventId to string to ensure consistent comparison
            const eventIdStr = String(eventId);

            // Get current user to check their access to threads
            const session = await window.getSessionWithRetry?.(3, 150);
            const user = session?.user;
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Get user's vendor profile if they have one
            const { data: vendorProfile } = await window.supabaseClient
                .from('vendor_profiles')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            const userVendorProfileId = vendorProfile?.id;

            const { data: threads, error } = await window.supabaseClient
                .from('message_threads')
                .select(`
                    id,
                    subject,
                    created_at,
                    updated_at,
                    event_id,
                    vendor_profile_id,
                    is_active,
                    messages!inner (
                        id,
                        content,
                        sender_vendor_profile_id,
                        sender_type,
                        created_at,
                        event_id
                    )
                `)
                .eq('event_id', eventIdStr)
                .eq('messages.event_id', eventIdStr)
                .order('updated_at', { ascending: false });

            if (error) {
                throw error;
            }

            // Filter threads based on user access (for group threads, check message_participants)
            const accessibleThreads = [];
            for (const thread of threads || []) {
                if (thread.subject === 'all_participants') {
                    // For group threads, check if user is a participant
                    const { data: isParticipant } = await window.supabaseClient
                        .from('message_participants')
                        .select('id')
                        .eq('thread_id', thread.id)
                        .eq('vendor_profile_id', userVendorProfileId || user.id)
                        .limit(1);
                    
                    if (isParticipant && isParticipant.length > 0) {
                        accessibleThreads.push(thread);
                    }
                } else {
                    // For 1:1 threads, use existing logic
                    accessibleThreads.push(thread);
                }
            }

            return accessibleThreads;

        } catch (error) {
            return [];
        }
    },

    // Get messages for a specific thread (event + vendor combination)
    async getThreadMessages(eventId, vendorProfileId, contextVendorId = null) {
        try {

            if (!window.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            if (!eventId || !vendorProfileId) {
                return [];
            }

            // First check if user has access to this event
            const session = await window.getSessionWithRetry?.(3, 150);
            const user = session?.user;
            if (!user) {
                throw new Error('User not authenticated');
            }


            // Convert to strings for consistent comparison
            const eventIdStr = String(eventId);
            const vendorIdStr = String(vendorProfileId);

            // Get current user's vendor profile for context
            const { data: currentVendorProfile } = await window.supabaseClient
                .from('vendor_profiles')
                .select('id, user_id')
                .eq('user_id', user.id)
                .maybeSingle();

            
            // IMPORTANT: Determine the correct vendor context
            let contextVendorProfileId = null;
            
            // Use passed contextVendorId first (from VendorEventView)
            if (contextVendorId) {
                // Verify this vendor profile belongs to current user
                const { data: vendorOwnership } = await window.supabaseClient
                    .from('vendor_profiles')
                    .select('id')
                    .eq('id', contextVendorId)
                    .eq('user_id', user.id)
                    .single();
                
                if (vendorOwnership) {
                    contextVendorProfileId = contextVendorId;
                } else {
                    return [];
                }
            }
            // Check if we're in a vendor context (VendorEventView)
            else if (window.location.hash.includes('/vendor-event/')) {
                // Extract vendor profile ID from URL hash
                const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
                const vendorIdFromUrl = urlParams.get('vendor');
                
                if (vendorIdFromUrl) {
                    // Verify this vendor profile belongs to current user
                    const { data: vendorOwnership } = await window.supabaseClient
                        .from('vendor_profiles')
                        .select('id')
                        .eq('id', vendorIdFromUrl)
                        .eq('user_id', user.id)
                        .single();
                    
                    if (vendorOwnership) {
                        contextVendorProfileId = vendorIdFromUrl;
                    } else {
                        return [];
                    }
                }
            } else if (currentVendorProfile) {
                contextVendorProfileId = currentVendorProfile.id;
            }

            // Check if user has access to this event
            const hasAccess = await this.checkEventAccess(eventIdStr, user.id);
            if (!hasAccess) {
                return [];
            }

            // Get the thread ID for this event + vendor combination
            let threadId = null;

            if (vendorIdStr === 'all_participants') {
                // Handle group thread
                const { data: groupThread, error: groupError } = await window.supabaseClient
                    .from('message_threads')
                    .select('id')
                    .eq('event_id', eventIdStr)
                    .eq('subject', 'all_participants')
                    .limit(1)
                    .maybeSingle();

                if (groupError && groupError.code !== 'PGRST116') {
                    return [];
                }

                threadId = groupThread?.id;
            } else if (vendorIdStr === 'event_planner') {
                // Handle event planner thread - find thread between current vendor and planner
                if (contextVendorProfileId) {
                    
                    // Look for thread where vendor_profile_id is the current vendor (for planner-vendor communication)
                    const { data: threads, error: threadError } = await window.supabaseClient
                        .from('message_threads')
                        .select('id, vendor_profile_id, subject, created_by')
                        .eq('event_id', eventIdStr)
                        .eq('vendor_profile_id', contextVendorProfileId)
                        .neq('subject', 'all_participants')
                        .not('subject', 'like', 'vendor_chat_%')
                        .limit(1)
                        .maybeSingle();

                    if (threadError && threadError.code !== 'PGRST116') {
                        return [];
                    }

                    threadId = threads?.id;
                } else {
                }
            } else {
                // Handle individual vendor thread (simplified - no vendor-to-vendor)
                
                if (contextVendorProfileId === vendorIdStr) {
                    // Vendor viewing their own thread with planner
                    const { data: threads, error: threadError } = await window.supabaseClient
                        .from('message_threads')
                        .select('id, vendor_profile_id, subject')
                        .eq('event_id', eventIdStr)
                        .eq('vendor_profile_id', vendorIdStr)
                        .neq('subject', 'all_participants')
                        .not('subject', 'like', 'vendor_chat_%')
                        .limit(1)
                        .maybeSingle();

                    if (threadError && threadError.code !== 'PGRST116') {
                        return [];
                    }

                    threadId = threads?.id;
                } else if (!contextVendorProfileId) {
                    // Event planner viewing vendor thread
                    const { data: threads, error: threadError } = await window.supabaseClient
                        .from('message_threads')
                        .select('id, vendor_profile_id, subject')
                        .eq('event_id', eventIdStr)
                        .eq('vendor_profile_id', vendorIdStr)
                        .neq('subject', 'all_participants')
                        .not('subject', 'like', 'vendor_chat_%')
                        .limit(1)
                        .maybeSingle();

                    if (threadError && threadError.code !== 'PGRST116') {
                        return [];
                    }

                    threadId = threads?.id;
                }
            }

            if (!threadId) {
                return [];
            }

            // Get messages for this specific thread ONLY
            const { data: messages, error } = await window.supabaseClient
                .from('messages')
                .select('id, thread_id, event_id, sender_vendor_profile_id, sender_type, content, created_at, sender_id')
                .eq('thread_id', threadId)
                .order('created_at', { ascending: true });

            if (error) {
                throw new Error(`Database query failed: ${error.message}`);
            }

            return messages || [];

        } catch (error) {
            return [];
        }
    },

    // Get or create thread for a specific recipient
    async getOrCreateThread(eventId, recipientId, subject = 'Event Discussion') {
        try {

            if (!window.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            // Handle group thread
            if (recipientId === 'all_participants') {
                const threadId = await this.getGroupThread(eventId);
                return threadId;
            }

            // Get current user's vendor profile
            const session = await window.getSessionWithRetry?.(3, 150);
            const user = session?.user;
            if (!user) {
                throw new Error('User not authenticated');
            }

            const { data: senderVendorProfile } = await window.supabaseClient
                .from('vendor_profiles')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            const senderVendorProfileId = senderVendorProfile?.id || user.id;

            // Look for existing thread for this vendor
            const { data: existingThread, error } = await window.supabaseClient
                .from('message_threads')
                .select('id')
                .eq('event_id', String(eventId))
                .eq('vendor_profile_id', String(recipientId))
                .limit(1)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (existingThread) {
                return existingThread.id;
            }

            // Create new thread if none exists
            const threadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const { error: createError } = await window.supabaseClient
                .from('message_threads')
                .insert({
                    id: threadId,
                    event_id: String(eventId),
                    vendor_profile_id: String(recipientId),
                    subject: subject,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (createError) {
                throw createError;
            }

            return threadId;

        } catch (error) {
            throw error;
        }
    },

    // Check if user has access to an event (application-level security)
    async checkEventAccess(eventId, userId) {
        try {
            // Check if user is the event creator
            const { data: event } = await window.supabaseClient
                .from('events')
                .select('user_id')
                .eq('id', eventId)
                .single();

            if (event && event.user_id === userId) {
                return true;
            }

            // Check if user is an assigned vendor
            const { data: vendorProfiles } = await window.supabaseClient
                .from('vendor_profiles')
                .select('id')
                .eq('user_id', userId);

            if (vendorProfiles && vendorProfiles.length > 0) {
                const vendorProfileIds = vendorProfiles.map(vp => vp.id);
                
                const { data: invitations } = await window.supabaseClient
                    .from('event_invitations')
                    .select('id')
                    .eq('event_id', eventId)
                    .eq('response', 'accepted')
                    .in('vendor_profile_id', vendorProfileIds)
                    .limit(1);

                if (invitations && invitations.length > 0) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            return false;
        }
    },

    // Helper function to get sender display name (event-scoped)
    getSenderName(message, vendorProfiles = []) {
        if (message.sender_type === 'vendor' && message.sender_vendor_profile_id) {
            const vendorProfile = vendorProfiles.find(vp => vp.id === message.sender_vendor_profile_id);
            return vendorProfile?.company || vendorProfile?.name || 'Vendor';
        }
        return 'Event Planner';
    },

    // Get messaging recipients without using RPC (fallback method)
    async getEventMessagingRecipientsDirectly(eventId) {
        try {

            if (!window.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            // Get ACTIVE (non-deleted) accepted event invitations with vendor profile data
            const eventIdStr = String(eventId);
            const { data: invitations, error } = await window.supabaseClient
                .from('event_invitations')
                .select(`
                    vendor_profile_id,
                    vendor_name,
                    event_id,
                    response,
                    vendor_profiles (
                        id,
                        name,
                        company
                    )
                `)
                .eq('event_id', eventIdStr)
                .eq('response', 'accepted')
                .not('vendor_profile_id', 'is', null);

            if (error) {
                throw error;
            }


            // Format recipients for messaging (only active vendors)
            const recipients = (invitations || []).map(inv => ({
                id: inv.vendor_profile_id,
                name: inv.vendor_profiles?.company || inv.vendor_profiles?.name || inv.vendor_name || 'Unknown Vendor',
                participant_type: 'vendor'
            }));

            return recipients;

        } catch (error) {
            return [];
        }
    },

    // Vendor-to-vendor messaging removed - vendors can only message planner and group

    // Send message to specific thread
    async sendMessageToThread(threadId, content, senderVendorProfileId) {
        try {
            const session = await window.getSessionWithRetry?.(3, 150);
            const user = session?.user;
            if (!user) {
                throw new Error('User not authenticated');
            }

            const senderType = senderVendorProfileId ? 'vendor' : 'planner';
            
            const { data: message, error: messageError } = await window.supabaseClient
                .from('messages')
                .insert({
                    thread_id: threadId,
                    sender_vendor_profile_id: senderVendorProfileId,
                    content: content,
                    sender_type: senderType,
                    sender_id: user.id
                })
                .select('*')
                .single();

            if (messageError) {
                throw messageError;
            }

            // Update thread timestamp
            await window.supabaseClient
                .from('message_threads')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', threadId);

            return message.id;
        } catch (error) {
            throw error;
        }
    },

    // Helper function to get user ID from vendor profile ID
    async getVendorUserId(vendorProfileId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('vendor_profiles')
                .select('user_id')
                .eq('id', vendorProfileId)
                .single();

            if (error) throw error;
            return data?.user_id;
        } catch (error) {
            return null;
        }
    }
};

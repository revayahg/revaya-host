async function fetchUserEvents() {
    try {
        // Validate supabase client first
        if (!window.supabaseClient) {
            return [];
        }

        // Use retry utility for session with fallback
        let session = null;
        if (window.getSessionWithRetry) {
            session = await window.getSessionWithRetry(3);
        } else if (window.getCurrentSession) {
            session = await window.getCurrentSession();
        }

        if (!session?.user?.id) {
            return [];
        }

        const { data, error } = await window.supabaseClient
            .from('events')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            return [];
        }
        return data || [];
    } catch (error) {
        return [];
    }
}

async function fetchUserVendorProfiles() {
    try {
        // Validate supabase client first
        if (!window.supabaseClient) {
            return [];
        }

        // Use retry utility for session with fallback
        let session = null;
        if (window.getSessionWithRetry) {
            session = await window.getSessionWithRetry(3);
        } else if (window.getCurrentSession) {
            session = await window.getCurrentSession();
        }

        if (!session?.user?.id) {
            return [];
        }

        const { data, error } = await window.supabaseClient
            .from('vendor_profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            return [];
        }
        return data || [];
    } catch (error) {
        return [];
    }
}

async function deleteEvent(eventId) {
    try {
        console.log('deleteEvent called with ID:', eventId); // Debug log
        
        // Validate supabase client first
        if (!window.supabaseClient) {
            throw new Error('Supabase client not available');
        }

        // Get current user from session with retry
        const session = await window.getSessionWithRetry(3);
        if (!session?.user?.id) {
            throw new Error('Authentication required to delete event');
        }

        console.log('User authenticated:', session.user.id); // Debug log

        // First, verify the user owns the event or has admin rights
        const { data: eventData, error: fetchError } = await window.supabaseClient
            .from('events')
            .select('id, user_id, created_by, title')
            .eq('id', eventId)
            .single();

        if (fetchError) {
            throw new Error(`Event not found: ${fetchError.message}`);
        }

        // Check ownership - user must be the creator or owner
        if (eventData.user_id !== session.user.id && eventData.created_by !== session.user.id) {
            throw new Error('You do not have permission to delete this event');
        }

        console.log('Event ownership verified, proceeding with deletion'); // Debug log

        // Get collaborators to notify them about the deletion
        let collaborators = [];
        try {
            const { data: collaboratorData } = await window.supabaseClient
                .from('event_user_roles')
                .select('user_id, role')
                .eq('event_id', eventId)
                .eq('status', 'active');
            
            collaborators = collaboratorData || [];
            console.log('Found collaborators to notify:', collaborators.length); // Debug log
        } catch (collaboratorError) {
            console.warn('Could not fetch collaborators for notifications:', collaboratorError);
        }

        // Delete related data first (cascading deletes)
        console.log('Deleting related data for event:', eventId); // Debug log
        
        // Delete budget items
        const { error: budgetError } = await window.supabaseClient
            .from('event_budget_items')
            .delete()
            .eq('event_id', eventId);
        
        if (budgetError) {
            console.warn('Error deleting budget items:', budgetError); // Debug log
        }

        // Delete event user roles (collaborators)
        const { error: rolesError } = await window.supabaseClient
            .from('event_user_roles')
            .delete()
            .eq('event_id', eventId);
        
        if (rolesError) {
            console.warn('Error deleting event roles:', rolesError); // Debug log
        }

        // Delete event collaborator invitations
        const { error: invitationsError } = await window.supabaseClient
            .from('event_collaborator_invitations')
            .delete()
            .eq('event_id', eventId);
        
        if (invitationsError) {
            console.warn('Error deleting collaborator invitations:', invitationsError); // Debug log
        }

        // Delete any other potential related tables
        // Delete event vendor invitations (if they exist)
        try {
            const { error: vendorInvitationsError } = await window.supabaseClient
                .from('event_vendor_invitations')
                .delete()
                .eq('event_id', eventId);
            
            if (vendorInvitationsError) {
                console.warn('Error deleting vendor invitations:', vendorInvitationsError); // Debug log
            }
        } catch (vendorInvitationsError) {
            console.log('Event vendor invitations table may not exist, skipping'); // Debug log
        }

        // Delete event schedule (if it exists as a separate table)
        try {
            const { error: scheduleError } = await window.supabaseClient
                .from('event_schedule')
                .delete()
                .eq('event_id', eventId);
            
            if (scheduleError) {
                console.warn('Error deleting event schedule:', scheduleError); // Debug log
            }
        } catch (scheduleError) {
            console.log('Event schedule table may not exist, skipping'); // Debug log
        }

        // Delete tasks
        const { error: tasksError } = await window.supabaseClient
            .from('tasks')
            .delete()
            .eq('event_id', eventId);
        
        if (tasksError) {
            console.warn('Error deleting tasks:', tasksError); // Debug log
        }

        // Delete event dates
        const { error: datesError } = await window.supabaseClient
            .from('event_dates')
            .delete()
            .eq('event_id', eventId);
        
        if (datesError) {
            console.warn('Error deleting event dates:', datesError); // Debug log
        }

        // Delete messages
        const { error: messagesError } = await window.supabaseClient
            .from('event_messages')
            .delete()
            .eq('event_id', eventId);
        
        if (messagesError) {
            console.warn('Error deleting messages:', messagesError); // Debug log
        }

        // Delete message threads and their related data (proper cascade order)
        console.log('Deleting message threads and related data...'); // Debug log
        
        try {
            // First, get all message threads for this event
            const { data: messageThreads, error: fetchThreadsError } = await window.supabaseClient
                .from('message_threads')
                .select('id')
                .eq('event_id', eventId);
            
            if (fetchThreadsError) {
                console.warn('Error fetching message threads:', fetchThreadsError); // Debug log
            } else if (messageThreads && messageThreads.length > 0) {
                console.log(`Found ${messageThreads.length} message threads to delete`); // Debug log
                
                // Delete messages in each thread first - comprehensive cleanup
                for (const thread of messageThreads) {
                    try {
                        console.log(`Processing thread ${thread.id} for deletion...`); // Debug log
                        
                        // Delete all possible child tables that might reference this thread
                        const threadChildTables = [
                            'messages',
                            'message_thread_participants',
                            'thread_messages', // Alternative table name
                            'thread_participants', // Alternative table name
                            'message_attachments', // If messages have attachments
                            'message_reactions', // If messages have reactions
                            'message_read_status', // If there's read status tracking
                            'thread_notifications', // If there are thread-specific notifications
                            'thread_settings', // If there are thread-specific settings
                        ];
                        
                        for (const childTable of threadChildTables) {
                            try {
                                const { error: childError } = await window.supabaseClient
                                    .from(childTable)
                                    .delete()
                                    .eq('thread_id', thread.id);
                                
                                if (!childError) {
                                    console.log(`Successfully deleted from ${childTable} for thread ${thread.id}`); // Debug log
                                }
                            } catch (childTableError) {
                                // Table might not exist or might not have thread_id column, that's okay
                                console.log(`Skipping ${childTable} for thread ${thread.id} (may not exist)`); // Debug log
                            }
                        }
                        
                        // Also try deleting by alternative column names
                        const alternativeColumns = ['message_thread_id', 'conversation_id', 'chat_id'];
                        for (const column of alternativeColumns) {
                            try {
                                const { error: altError } = await window.supabaseClient
                                    .from('messages')
                                    .delete()
                                    .eq(column, thread.id);
                                
                                if (!altError) {
                                    console.log(`Successfully deleted messages by ${column} for thread ${thread.id}`); // Debug log
                                }
                            } catch (altError) {
                                // Column might not exist, that's okay
                                console.log(`Skipping ${column} deletion for thread ${thread.id} (column may not exist)`); // Debug log
                            }
                        }
                        
                    } catch (threadError) {
                        console.warn(`Error processing thread ${thread.id}:`, threadError); // Debug log
                    }
                }
                
                // Now delete the message threads themselves
                const { error: messageThreadsError } = await window.supabaseClient
                    .from('message_threads')
                    .delete()
                    .eq('event_id', eventId);
                
                if (messageThreadsError) {
                    console.warn('Error deleting message threads:', messageThreadsError); // Debug log
                } else {
                    console.log('Successfully deleted message threads'); // Debug log
                }
            } else {
                console.log('No message threads found for this event'); // Debug log
            }
        } catch (messageSystemError) {
            console.warn('Error in message system deletion:', messageSystemError); // Debug log
        }

        // Delete event vendor assignments
        const { error: vendorError } = await window.supabaseClient
            .from('event_vendors')
            .delete()
            .eq('event_id', eventId);
        
        if (vendorError) {
            console.warn('Error deleting vendor assignments:', vendorError); // Debug log
        }

        // Delete event notifications
        const { error: notificationsError } = await window.supabaseClient
            .from('notifications')
            .delete()
            .eq('event_id', eventId);
        
        if (notificationsError) {
            console.warn('Error deleting event notifications:', notificationsError); // Debug log
        }

        // Delete event pins (if they exist)
        try {
            const { error: pinsError } = await window.supabaseClient
                .from('event_pins')
                .delete()
                .eq('event_id', eventId);
            
            if (pinsError) {
                console.warn('Error deleting event pins:', pinsError); // Debug log
            }
        } catch (pinsError) {
            // Table might not exist, that's okay
            console.log('Event pins table may not exist, skipping'); // Debug log
        }

        // Delete event documents (if they exist)
        try {
            const { error: documentsError } = await window.supabaseClient
                .from('event_documents')
                .delete()
                .eq('event_id', eventId);
            
            if (documentsError) {
                console.warn('Error deleting event documents:', documentsError); // Debug log
            }
        } catch (documentsError) {
            // Table might not exist, that's okay
            console.log('Event documents table may not exist, skipping'); // Debug log
        }

        // Finally, delete the event itself
        console.log('Deleting main event record'); // Debug log
        const { error } = await window.supabaseClient
            .from('events')
            .delete()
            .eq('id', eventId);

        if (error) {
            console.error('Final delete error details:', error); // Debug log
            
            // If we still get a foreign key constraint error, try to identify the remaining tables
            if (error.message && error.message.includes('foreign key constraint')) {
                console.error('Foreign key constraint still exists. This might indicate missing related tables.'); // Debug log
                
                // Try to provide more helpful error information
                const constraintMatch = error.message.match(/constraint "([^"]+)"/);
                if (constraintMatch) {
                    const constraintName = constraintMatch[1];
                    
                    // Try to extract table name from constraint name for better error message
                    let tableName = 'unknown table';
                    if (constraintName.includes('_event_id_fkey')) {
                        tableName = constraintName.replace('_event_id_fkey', '');
                    }
                    
                    console.error(`Foreign key constraint violation on table: ${tableName}`); // Debug log
                    
                    // Try one more comprehensive deletion attempt
                    console.log('Attempting comprehensive deletion of all possible related tables...'); // Debug log
                    
                    try {
                        // List of all possible tables that might reference events
                        // Order matters - delete child records before parent records
                        const possibleTables = [
                            // Child tables first
                            'messages', // Messages in threads
                            'message_thread_participants', // Participants in threads
                            'event_messages', // Direct event messages
                            'event_collaborator_invitations',
                            'event_user_roles', 
                            'event_budget_items',
                            'tasks',
                            'event_dates',
                            'event_vendors',
                            'notifications',
                            // Parent tables last
                            'message_threads', // This must come after messages and participants
                            'event_pins',
                            'event_documents',
                            'event_vendor_invitations',
                            'event_schedule',
                            'event_files',
                            'event_attachments',
                            'event_comments',
                            'event_reviews',
                            'event_ratings'
                        ];
                        
                        for (const tableName of possibleTables) {
                            try {
                                // Special handling for message-related tables
                                if (tableName === 'messages') {
                                    // Delete messages by thread_id (need to get thread IDs first)
                                    const { data: threads } = await window.supabaseClient
                                        .from('message_threads')
                                        .select('id')
                                        .eq('event_id', eventId);
                                    
                                    if (threads && threads.length > 0) {
                                        for (const thread of threads) {
                                            const { error: messagesError } = await window.supabaseClient
                                                .from('messages')
                                                .delete()
                                                .eq('thread_id', thread.id);
                                            
                                            if (!messagesError) {
                                                console.log(`Successfully deleted messages for thread ${thread.id}`); // Debug log
                                            }
                                        }
                                    }
                                } else if (tableName === 'message_thread_participants') {
                                    // Delete participants by thread_id
                                    const { data: threads } = await window.supabaseClient
                                        .from('message_threads')
                                        .select('id')
                                        .eq('event_id', eventId);
                                    
                                    if (threads && threads.length > 0) {
                                        for (const thread of threads) {
                                            const { error: participantsError } = await window.supabaseClient
                                                .from('message_thread_participants')
                                                .delete()
                                                .eq('thread_id', thread.id);
                                            
                                            if (!participantsError) {
                                                console.log(`Successfully deleted participants for thread ${thread.id}`); // Debug log
                                            }
                                        }
                                    }
                                } else {
                                    // Standard deletion by event_id
                                    const { error: tableError } = await window.supabaseClient
                                        .from(tableName)
                                        .delete()
                                        .eq('event_id', eventId);
                                    
                                    if (!tableError) {
                                        console.log(`Successfully deleted from ${tableName}`); // Debug log
                                    }
                                }
                            } catch (tableError) {
                                // Table might not exist or might not have the expected column, that's okay
                                console.log(`Skipping table ${tableName} (may not exist or have expected column)`); // Debug log
                            }
                        }
                        
                        // Try to delete the event again
                        console.log('Retrying event deletion after comprehensive cleanup...'); // Debug log
                        const { error: retryError } = await window.supabaseClient
                            .from('events')
                            .delete()
                            .eq('id', eventId);
                        
                        if (!retryError) {
                            console.log('Event deleted successfully on retry'); // Debug log
                            // Continue with the rest of the function
                        } else {
                            console.error('Still cannot delete event after comprehensive cleanup. Trying final aggressive approach...'); // Debug log
                            
                            // Final aggressive approach - try to force delete by updating constraints
                            try {
                                // Try to delete with CASCADE if possible
                                console.log('Attempting CASCADE delete...'); // Debug log
                                
                                // First try the RPC function if it exists
                                let cascadeError = null;
                                try {
                                    const { error: rpcError } = await window.supabaseClient
                                        .rpc('delete_event_cascade', { event_id: eventId });
                                    cascadeError = rpcError;
                                } catch (rpcError) {
                                    console.log('delete_event_cascade RPC function not available, trying alternative approach...'); // Debug log
                                    cascadeError = rpcError;
                                }
                                
                                // If RPC doesn't exist, try a more aggressive manual approach
                                if (cascadeError && cascadeError.message && cascadeError.message.includes('function')) {
                                    console.log('RPC function not found, trying manual CASCADE approach...'); // Debug log
                                    
                                    // Manual cascade deletion with more aggressive cleanup
                                    const manualCascadeTables = [
                                        // Delete in reverse dependency order
                                        'messages',
                                        'message_thread_participants', 
                                        'message_threads',
                                        'event_messages',
                                        'event_collaborator_invitations',
                                        'event_user_roles',
                                        'event_budget_items',
                                        'tasks',
                                        'event_dates',
                                        'event_vendors',
                                        'notifications'
                                    ];
                                    
                                    for (const table of manualCascadeTables) {
                                        try {
                                            if (table === 'messages' || table === 'message_thread_participants') {
                                                // Handle thread-related tables
                                                const { data: threads } = await window.supabaseClient
                                                    .from('message_threads')
                                                    .select('id')
                                                    .eq('event_id', eventId);
                                                
                                                if (threads && threads.length > 0) {
                                                    for (const thread of threads) {
                                                        const { error: tableError } = await window.supabaseClient
                                                            .from(table)
                                                            .delete()
                                                            .eq('thread_id', thread.id);
                                                        
                                                        if (!tableError) {
                                                            console.log(`Manual cascade: deleted from ${table} for thread ${thread.id}`); // Debug log
                                                        }
                                                    }
                                                }
                                            } else {
                                                // Standard deletion by event_id
                                                const { error: tableError } = await window.supabaseClient
                                                    .from(table)
                                                    .delete()
                                                    .eq('event_id', eventId);
                                                
                                                if (!tableError) {
                                                    console.log(`Manual cascade: deleted from ${table}`); // Debug log
                                                }
                                            }
                                        } catch (tableError) {
                                            console.log(`Manual cascade: skipped ${table} (may not exist)`); // Debug log
                                        }
                                    }
                                    
                                    // Now try to delete the event
                                    const { error: manualRetryError } = await window.supabaseClient
                                        .from('events')
                                        .delete()
                                        .eq('id', eventId);
                                    
                                    if (!manualRetryError) {
                                        console.log('Event deleted successfully using manual CASCADE approach'); // Debug log
                                        cascadeError = null; // Success
                                    } else {
                                        cascadeError = manualRetryError;
                                    }
                                }
                                
                                if (!cascadeError) {
                                    console.log('Event deleted successfully using CASCADE function'); // Debug log
                                    // Continue with the rest of the function
                                } else {
                                    console.warn('CASCADE delete failed:', cascadeError); // Debug log
                                    
                                    // Last resort: try to delete the specific problematic table first
                                    if (tableName === 'message_threads') {
                                        console.log('Attempting direct deletion of problematic message_threads...'); // Debug log
                                        
                                        // Try to force delete the message_threads by ID
                                        const { data: threadsToDelete } = await window.supabaseClient
                                            .from('message_threads')
                                            .select('id')
                                            .eq('event_id', eventId);
                                        
                                        if (threadsToDelete && threadsToDelete.length > 0) {
                                            for (const thread of threadsToDelete) {
                                                try {
                                                    // Try to delete by ID instead of event_id
                                                    const { error: directDeleteError } = await window.supabaseClient
                                                        .from('message_threads')
                                                        .delete()
                                                        .eq('id', thread.id);
                                                    
                                                    if (!directDeleteError) {
                                                        console.log(`Successfully deleted message_thread ${thread.id} directly`); // Debug log
                                                    }
                                                } catch (directDeleteError) {
                                                    console.warn(`Failed to delete message_thread ${thread.id} directly:`, directDeleteError); // Debug log
                                                }
                                            }
                                            
                                            // Try to delete the event again
                                            const { error: finalRetryError } = await window.supabaseClient
                                                .from('events')
                                                .delete()
                                                .eq('id', eventId);
                                            
                                            if (!finalRetryError) {
                                                console.log('Event deleted successfully after direct thread deletion'); // Debug log
                                                // Continue with the rest of the function
                                            } else {
                                                throw new Error(`Still cannot delete event even after direct thread deletion. Constraint: ${constraintName}. Table: ${tableName}`);
                                            }
                                        }
                                    }
                                    
                                    throw new Error(`Still cannot delete event after comprehensive cleanup. Constraint: ${constraintName}. Table: ${tableName}`);
                                }
                            } catch (cascadeError) {
                                console.warn('CASCADE delete approach failed:', cascadeError); // Debug log
                                throw new Error(`Still cannot delete event after comprehensive cleanup. Constraint: ${constraintName}. Table: ${tableName}`);
                            }
                        }
                    } catch (retryError) {
                        throw new Error(`Cannot delete event due to remaining related data. Constraint: ${constraintName}. Table: ${tableName}. Please contact support if this persists.`);
                    }
                }
            }
            
            throw new Error(`Failed to delete event: ${error.message || error.details || 'Unknown database error'}`);
        }

        console.log('Event deleted successfully from database'); // Debug log

        // Send notifications to collaborators about the event deletion
        if (collaborators.length > 0) {
            console.log('Sending deletion notifications to collaborators'); // Debug log
            try {
                for (const collaborator of collaborators) {
                    try {
                        const notificationPayload = {
                            user_id: collaborator.user_id,
                            type: 'event_deleted',
                            title: 'Event Deleted',
                            message: `The event "${eventData.title}" has been deleted`,
                            event_id: eventId, // Keep event_id for reference even though event is deleted
                            read_status: false,
                            metadata: {
                                event_title: eventData.title,
                                deleted_by: session.user.id,
                                deleted_at: new Date().toISOString()
                            }
                        };

                        const { error: notificationError } = await window.supabaseClient
                            .from('notifications')
                            .insert([notificationPayload]);

                        if (notificationError) {
                            console.warn('Failed to create deletion notification for collaborator:', collaborator.user_id, notificationError);
                        } else {
                            console.log('Deletion notification sent to collaborator:', collaborator.user_id);
                        }
                    } catch (notifError) {
                        console.warn('Error sending notification to collaborator:', collaborator.user_id, notifError);
                    }
                }
            } catch (notificationError) {
                console.warn('Error in notification process:', notificationError);
            }
        }

        // Also delete from Trickle database if exists
        try {
            if (window.trickleListObjects && window.trickleDeleteObject) {
                const trickleEvents = await window.trickleListObjects('supabase_events');
                const trickleEvent = trickleEvents.items.find(te => te.supabase_id === eventId);
                if (trickleEvent) {
                    await window.trickleDeleteObject('supabase_events', trickleEvent.id);
                    console.log('Event deleted from Trickle database'); // Debug log
                }
            }
        } catch (err) {
            console.warn('Error deleting from Trickle:', err); // Debug log
        }

        console.log('Event deletion completed successfully'); // Debug log
        return true;
    } catch (error) {
        console.error('Error in deleteEvent:', error); // Debug log
        throw error;
    }
}

async function deleteVendorProfile(profileId) {
    try {
        // Validate supabase client first
        if (!window.supabaseClient) {
            throw new Error('Supabase client not available');
        }

        // Get current user from session
        const session = await getCurrentSession();
        if (!session?.user?.id) {
            throw new Error('Authentication required to delete vendor profile');
        }

        // Delete from Supabase
        const { error } = await window.supabaseClient
            .from('vendor_profiles')
            .delete()
            .eq('id', profileId)
            .eq('user_id', session.user.id); // Ensure user owns the profile

        if (error) {
            throw new Error(`Failed to delete vendor profile: ${error.message || error.details || 'Unknown database error'}`);
        }

        return true;
    } catch (error) {
        throw new Error(error.message || 'Failed to delete vendor profile');
    }
}

// Budget API - now uses event_budget_items table
async function saveBudget(eventId, budgetData) {
    try {
        const items = Array.isArray(budgetData) ? budgetData : (budgetData?.budget_items || []);
        return await window.budgetAPI.saveBudgetItems(eventId, items);
    } catch (error) {
        throw error;
    }
}

// Get budget for event
async function getBudget(eventId) {
    try {
        return await window.budgetAPI.getBudgetItems(eventId);
    } catch (error) {
        throw error;
    }
}

// Get single event by ID
async function getEvent(eventId) {
    try {
        if (!window.supabaseClient) {
            throw new Error('Supabase client not available');
        }

        const user = await window.getUser();
        if (!user?.id) {
            throw new Error('Authentication required');
        }


        // Get event data - no user restrictions for collaborator access
        const { data: eventData, error: eventError } = await window.supabaseClient
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (eventError) {
            throw new Error(`Failed to fetch event: ${eventError.message}`);
        }

        if (!eventData) {
            throw new Error('Event not found');
        }

        // Load event dates from event_dates table
        try {
            const { data: eventDates } = await window.supabaseClient
                .from('event_dates')
                .select('*')
                .eq('event_id', eventId)
                .order('event_date', { ascending: true });

            if (eventDates && eventDates.length > 0) {
                // Convert event_dates to event_schedule format for display
                eventData.event_schedule = eventDates.map(dateItem => ({
                    date: dateItem.event_date,
                    startTime: dateItem.start_time,
                    endTime: dateItem.end_time
                }));
            }
        } catch (datesError) {
            console.warn('Failed to load event dates:', datesError);
            // Continue without dates - event_schedule will remain as-is
        }

        // Check if user is owner
        const isOwner = eventData.created_by === user.id || eventData.user_id === user.id;

        if (isOwner) {
            return eventData;
        }

        // Check if user is a collaborator
        const { data: collaboratorRole } = await window.supabaseClient
            .from('event_user_roles')
            .select('role, status')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

        if (collaboratorRole) {
            return eventData;
        }

        // User has no access
        throw new Error('Access denied - you do not have permission to view this event');

    } catch (error) {
        throw error;
    }
}

// Make functions available globally
window.fetchUserEvents = fetchUserEvents;
window.fetchUserVendorProfiles = fetchUserVendorProfiles;
window.deleteEvent = deleteEvent;
window.deleteVendorProfile = deleteVendorProfile;
window.saveBudget = saveBudget;
window.getBudget = getBudget;
window.getEvent = getEvent;

// Create global api object
window.api = {
    getEvent,
    fetchUserEvents,
    fetchUserVendorProfiles,
    deleteEvent,
    deleteVendorProfile,
    saveBudget,
    getBudget
};

// Also expose deleteEvent directly for easier access
window.deleteEvent = deleteEvent;

// Scalable Task API using proper database table structure
// Following the same pattern as budgetAPI for millions of records

window.TaskAPI = {
    // Create a new task
    async createTask(taskData) {
        
        try {
            // Basic validation
            if (!taskData.event_id) {
                throw new Error('Event ID is required');
            }
            
            if (!taskData.title) {
                throw new Error('Task title is required');
            }

            // Only include valid task columns to prevent schema errors
            const validColumns = ['event_id', 'title', 'description', 'category', 'status', 'priority', 'due_date', 'start_date', 'assigned_to'];
            const newTask = {};
            
            // Only add valid columns from taskData with proper validation
            validColumns.forEach(column => {
                if (taskData.hasOwnProperty(column)) {
                    let value = taskData[column];
                    
                    // Sanitize text fields for security
                    if ((column === 'title' || column === 'description') && typeof value === 'string') {
                        if (window.InputSanitizer) {
                            if (column === 'title') {
                                value = window.InputSanitizer.sanitizeText(value, 200); // Title max 200 chars
                            } else {
                                value = window.InputSanitizer.sanitizeDescription(value, 10000); // Description max 10k chars
                            }
                        } else {
                            // Fallback: basic trim and length limit
                            value = value.trim();
                            if (column === 'title' && value.length > 200) value = value.substring(0, 200);
                            if (column === 'description' && value.length > 10000) value = value.substring(0, 10000);
                        }
                    }
                    
                    // Special handling for date fields
                    if (column === 'due_date' || column === 'start_date') {
                        // Convert empty strings to null for date fields
                        if (value === '' || value === undefined) {
                            value = null;
                        } else if (value && typeof value === 'string') {
                            // Use DateUtils for proper conversion if available
                            if (window.DateUtils) {
                                const dbDate = window.DateUtils.inputToDbDate(value);
                                value = dbDate; // Will be null if invalid
                            } else {
                                // Fallback validation
                                const dateTest = new Date(value);
                                if (isNaN(dateTest.getTime())) {
                                    value = null; // Invalid date becomes null
                                }
                            }
                        }
                    }
                    
                    newTask[column] = value;
                } else {
                    // Set defaults for required fields
                    switch (column) {
                        case 'description':
                            newTask[column] = taskData[column] || '';
                            break;
                        case 'category':
                            newTask[column] = taskData[column] || 'General';
                            break;
                        case 'status':
                            newTask[column] = taskData[column] || 'not_started';
                            break;
                        case 'priority':
                            newTask[column] = taskData[column] || 'medium';
                            break;
                        case 'due_date':
                        case 'start_date':
                        case 'assigned_to':
                            newTask[column] = taskData[column] || null;
                            break;
                    }
                }
            });


            // Direct supabase call
            const response = await window.supabaseClient
                .from('tasks')
                .insert([newTask])
                .select();


            if (response.error) {
                throw new Error(response.error.message);
            }

            const createdTask = response.data[0];
            
            // Create in-app notification for task assignments
            if (taskData.assigned_to_type === 'user_id' && taskData.assigned_to) {
                const assignmentToken = window.notificationAPI?.generateTaskAssignmentToken
                    ? window.notificationAPI.generateTaskAssignmentToken()
                    : `task_${Date.now()}_${Math.random().toString(36).substring(2)}`;
                try {
                    // Direct notification creation using Supabase
                    const notificationPayload = {
                        user_id: taskData.assigned_to,
                        type: 'task_assigned',
                        title: `New Task Assigned: ${taskData.title}`,
                        message: `You have been assigned a task: ${taskData.title}`,
                        event_id: taskData.event_id,
                        read_status: false,
                        metadata: {
                            task_id: createdTask.id,
                            task_title: taskData.title,
                            task_description: taskData.description,
                            due_date: taskData.due_date,
                            start_date: taskData.start_date,
                            priority: taskData.priority,
                            category: taskData.category,
                            task_assignment_token: assignmentToken
                        }
                    };

                    // Direct Supabase insert to bypass any RLS issues
                    const enrichedPayload = window.notificationAPI?.enrichPayload
                        ? window.notificationAPI.enrichPayload(notificationPayload)
                        : notificationPayload;

                    const { data: notification, error: notifError } = await window.supabaseClient
                        .from('notifications')
                        .insert([enrichedPayload])
                        .select()
                        .single();

                    if (notifError) {
                    } else {
                        
                        // Dispatch events for real-time UI updates
                        if (window.EventBus && window.EventBus.emit) {
                            window.EventBus.emit('notificationCreated', { notification: notification || enrichedPayload });
                        }
                        window.dispatchEvent(new CustomEvent('notificationCreated', { 
                            detail: { notification: notification || enrichedPayload } 
                        }));
                        
                        // Also dispatch task assignment specific event
                        window.dispatchEvent(new CustomEvent('taskAssigned', {
                            detail: {
                                task: createdTask,
                                assignee: taskData.assigned_to,
                                notification: notification || enrichedPayload
                            }
                        }));
                    }
                    
                } catch (notificationError) {
                    // Don't fail task creation if notification fails
                }

                // Send email notification for task assignments
                try {
                    // Send email notification using unified notification service
                    await this.sendTaskAssignmentEmailWithToken(taskData, createdTask, assignmentToken);
                } catch (emailError) {
                    console.error('❌ Task assignment email failed (non-blocking):', emailError);
                    // Don't fail task creation if email fails
                }
            }
            
            return createdTask;
            
        } catch (error) {
            throw error;
        }
    },

    async deleteTask(taskId) {
        
        try {
            if (!taskId) {
                throw new Error('Task ID is required');
            }

            const response = await window.supabaseClient
                .from('tasks')
                .delete()
                .eq('id', taskId);


            if (response.error) {
                throw new Error(response.error.message);
            }

            return true;
            
        } catch (error) {
            throw error;
        }
    },

    // Update an existing task
    async updateTask(taskId, taskData) {
        try {

            if (!window.supabaseClient) {
                throw new Error('Database connection not available');
            }

            // Only include valid task columns to prevent schema errors
            const validColumns = ['title', 'description', 'category', 'status', 'priority', 'due_date', 'start_date', 'assigned_to'];
            const updates = {
                updated_at: new Date().toISOString()
            };
            
            // Only add valid columns from taskData with proper validation
                    validColumns.forEach(column => {
                if (taskData.hasOwnProperty(column)) {
                    let value = taskData[column];
                    
                    // Sanitize text fields for security
                    if ((column === 'title' || column === 'description') && typeof value === 'string') {
                        if (window.InputSanitizer) {
                            if (column === 'title') {
                                value = window.InputSanitizer.sanitizeText(value, 200); // Title max 200 chars
                            } else {
                                value = window.InputSanitizer.sanitizeDescription(value, 10000); // Description max 10k chars
                            }
                        } else {
                            // Fallback: basic trim and length limit
                            value = value.trim();
                            if (column === 'title' && value.length > 200) value = value.substring(0, 200);
                            if (column === 'description' && value.length > 10000) value = value.substring(0, 10000);
                        }
                    }
                    
                    // Special handling for date fields
                    if (column === 'due_date' || column === 'start_date') {
                        // Convert empty strings to null for date fields
                        if (value === '' || value === undefined) {
                            value = null;
                        } else if (value && typeof value === 'string') {
                            // Use DateUtils for proper conversion if available
                            if (window.DateUtils) {
                                const dbDate = window.DateUtils.inputToDbDate(value);
                                value = dbDate; // Will be null if invalid
                            } else {
                                // Fallback validation
                                const dateTest = new Date(value);
                                if (isNaN(dateTest.getTime())) {
                                    value = null; // Invalid date becomes null
                                }
                            }
                        }
                    }
                    
                    updates[column] = value;
                }
            });
            
            // Ensure assigned_to is properly handled
            if (taskData.assigned_to !== undefined) {
                updates.assigned_to = taskData.assigned_to || null;
            }

            const { data, error } = await window.supabaseClient
                .from('tasks')
                .update(updates)
                .eq('id', taskId)
                .select()
                .single();

        if (error) {
            throw new Error(`Failed to update task: ${error.message}`);
        }


            // Create notification for task update if assigned to someone
            // This works regardless of assignee's role (owner, editor, viewer) in the event
            if (data.assigned_to && data.assigned_to_type === 'user_id') {
                try {
                    const notificationPayload = {
                        user_id: data.assigned_to,
                        type: 'task_updated',
                        title: 'Task Changed',
                        message: `Task "${data.title}" has been changed`,
                        event_id: data.event_id,
                        read_status: false,
                        metadata: {
                            task_id: data.id,
                            task_title: data.title,
                            changes: Object.keys(taskData).join(', ')
                        }
                    };

                    const enrichedPayload = window.notificationAPI?.enrichPayload
                        ? window.notificationAPI.enrichPayload(notificationPayload)
                        : notificationPayload;

                    const { error: notificationError } = await window.supabaseClient
                        .from('notifications')
                        .insert([enrichedPayload]);

                    if (notificationError) {
                    } else {
                        
                        // Dispatch events for real-time updates
                        if (window.EventBus && window.EventBus.emit) {
                            window.EventBus.emit('notificationCreated', { notification: enrichedPayload });
                        }
                        window.dispatchEvent(new CustomEvent('notificationCreated', { 
                            detail: { notification: enrichedPayload } 
                        }));
                    }
                } catch (notificationError) {
                }
            }

            // Create notification for task updates
            if (taskData.status && data.assignee_vendor_id) {
                try {
                    const assigneeUserId = await this.getVendorUserId(data.assignee_vendor_id);
                    if (assigneeUserId && window.notificationAPI) {
                        await window.notificationAPI.createNotification({
                            userId: assigneeUserId,
                            type: 'task_updated',
                            title: 'Task Status Updated',
                            message: `Task "${data.title}" status changed to ${taskData.status}`,
                            eventId: data.event_id,
                            relatedId: data.id
                        });
                    }
                } catch (notificationError) {
                }
            }

            return data;
        } catch (error) {
            throw error;
        }
    },

    // Update task status (optimized for frequent updates)
    async updateTaskStatus(taskId, status, currentUserId = null) {
        try {

            const updates = { 
                status: status,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await window.supabaseClient
                .from('tasks')
                .update(updates)
                .eq('id', taskId)
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to update task status: ${error.message}`);
            }

            console.log('🔍 Task status update debug:', {
                taskId,
                status,
                currentUserId,
                taskData: data,
                assigned_to: data.assigned_to,
                assigned_to_type: data.assigned_to_type
            });

            // Get event owner information for task creator notifications
            let eventOwner = null;
            try {
                const { data: eventData } = await window.supabaseClient
                    .from('events')
                    .select('user_id, created_by')
                    .eq('id', data.event_id)
                    .single();
                
                eventOwner = eventData?.user_id || eventData?.created_by;
            } catch (eventError) {
                console.warn('Could not fetch event owner for task notifications:', eventError);
            }

            // Get current user if not provided
            if (!currentUserId) {
                try {
                    const { data: { user } } = await window.supabaseClient.auth.getUser();
                    currentUserId = user?.id;
                } catch (authError) {
                    console.warn('Could not get current user for task notifications:', authError);
                }
            }

            // Create notifications based on status change
            const notificationsToSend = [];

            console.log('📝 Creating notifications for status change:', {
                hasAssignee: !!data.assigned_to,
                assignedToType: data.assigned_to_type,
                eventOwner,
                status
            });

            // 1. Always notify assignee of status change (if assigned to someone)
            // Check if assigned_to is a valid user ID (UUID format) regardless of assigned_to_type
            const isAssignedToUser = data.assigned_to && 
                (data.assigned_to_type === 'user_id' || 
                 (data.assigned_to.length === 36 && data.assigned_to.includes('-'))); // UUID format
                
            if (isAssignedToUser) {
                console.log('📤 Sending status change notification to assignee:', data.assigned_to);
                notificationsToSend.push({
                    user_id: data.assigned_to,
                    type: status === 'completed' ? 'task_completed' : 'task_updated',
                    title: status === 'completed' ? 'Task Completed' : 'Task Status Updated',
                    message: status === 'completed' 
                        ? `Task "${data.title}" has been completed` 
                        : `Task "${data.title}" status changed to ${status}`,
                    event_id: data.event_id,
                    read_status: false,
                    metadata: {
                        task_id: data.id,
                        task_title: data.title,
                        new_status: status,
                        previous_status: data.status,
                        start_date: data.start_date,
                        due_date: data.due_date
                    }
                });
            } else {
                console.log('⚠️ No notification sent - task not assigned to a user:', {
                    assigned_to: data.assigned_to,
                    assigned_to_type: data.assigned_to_type,
                    isUUID: data.assigned_to && data.assigned_to.length === 36 && data.assigned_to.includes('-')
                });
            }

            // 2. Special handling for task completion - notify creator if different from assignee
            if (status === 'completed') {
                console.log('🎯 Task completed - checking if creator should be notified:', {
                    eventOwner,
                    assignedTo: data.assigned_to,
                    shouldNotifyCreator: eventOwner && eventOwner !== data.assigned_to
                });
                
                // Notify event owner (task creator) if different from assignee
                if (eventOwner && eventOwner !== data.assigned_to) {
                    console.log('📤 Sending completion notification to creator:', eventOwner);
                    notificationsToSend.push({
                        user_id: eventOwner,
                        type: 'task_completed',
                        title: 'Task Completed',
                        message: `Task "${data.title}" has been completed`,
                        event_id: data.event_id,
                        read_status: false,
                        metadata: {
                            task_id: data.id,
                            task_title: data.title,
                            new_status: 'completed',
                            completed_by: currentUserId,
                            assignee_id: data.assigned_to,
                            creator_id: eventOwner,
                            start_date: data.start_date,
                            due_date: data.due_date
                        }
                    });
                }
            }

            // Send all notifications using unified notification service for email support
            for (const notificationPayload of notificationsToSend) {
                try {
                    const enrichedPayload = window.notificationAPI?.enrichPayload
                        ? window.notificationAPI.enrichPayload(notificationPayload)
                        : notificationPayload;
                    const linkInfo = window.notificationAPI?.getNotificationLink
                        ? window.notificationAPI.getNotificationLink({
                            type: enrichedPayload.type,
                            eventId: enrichedPayload.event_id,
                            metadata: enrichedPayload.metadata
                        })
                        : null;

                    // Use unified notification service for email notifications
                    if (window.unifiedNotificationService) {
                        console.log('📧 Sending task notification via unified service:', notificationPayload.type);
                        
                        // Get user email for the notification
                        let userEmail = null;
                        try {
                            const { data: userData } = await window.supabaseClient
                                .from('profiles')
                                .select('email')
                                .eq('id', notificationPayload.user_id)
                                .single();
                            userEmail = userData?.email;
                        } catch (emailError) {
                            console.warn('Could not fetch user email for notification:', emailError);
                        }
                        
                        if (userEmail) {
                            await window.unifiedNotificationService.sendNotification({
                                email: userEmail,
                                notification_type: enrichedPayload.type,
                                event_id: enrichedPayload.event_id,
                                event_name: data.title || 'Event', // Use event title if available
                                task_title: enrichedPayload.metadata?.task_title,
                                task_status: enrichedPayload.metadata?.new_status,
                                start_date: enrichedPayload.metadata?.start_date,
                                due_date: enrichedPayload.metadata?.due_date,
                                message: enrichedPayload.message,
                                title: enrichedPayload.title,
                                accept_url: linkInfo?.url || `https://revayahost.com/#/event/view/${enrichedPayload.event_id}`
                            });
                            console.log('✅ Task notification sent via unified service:', notificationPayload.type, 'to user:', notificationPayload.user_id, 'email:', userEmail);
                        } else {
                            console.warn('⚠️ No email found for user, skipping email notification:', notificationPayload.user_id);
                        }
                    } else {
                        // Fallback to direct database insert if unified service not available
                        console.warn('⚠️ Unified notification service not available, using fallback');
                        const { error: notificationError } = await window.supabaseClient
                            .from('notifications')
                            .insert([enrichedPayload]);

                        if (notificationError) {
                            console.warn('Failed to create task notification:', notificationError);
                        } else {
                            console.log('✅ Task notification sent (fallback):', notificationPayload.type, 'to user:', notificationPayload.user_id);
                        }
                    }
                    
                    // Dispatch events for real-time updates
                    if (window.EventBus && window.EventBus.emit) {
                        window.EventBus.emit('notificationCreated', { notification: enrichedPayload });
                    }
                    window.dispatchEvent(new CustomEvent('notificationCreated', { 
                        detail: { notification: enrichedPayload } 
                    }));
                } catch (notificationError) {
                    console.warn('Error creating task notification:', notificationError);
                }
            }

            return data;
        } catch (error) {
            throw error;
        }
    },

    // Get tasks for an event with pagination and filtering
    async getEventTasks(eventId, options = {}) {
        try {

            if (!window.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            let query = window.supabaseClient
                .from('tasks')
                .select(`
                    *,
                    vendor_profiles!assignee_vendor_id(
                        id,
                        name,
                        company
                    )
                `)
                .eq('event_id', eventId);

            // Apply filters
            if (options.status) {
                query = query.eq('status', options.status);
            }
            if (options.priority) {
                query = query.eq('priority', options.priority);
            }
            if (options.assignee_vendor_id) {
                query = query.eq('assignee_vendor_id', options.assignee_vendor_id);
            }
            if (options.category) {
                query = query.eq('category', options.category);
            }

            // Apply pagination
            const limit = options.limit || 50;
            const offset = options.offset || 0;
            query = query.range(offset, offset + limit - 1);

            // Apply sorting
            const sortBy = options.sortBy || 'created_at';
            const sortOrder = options.sortOrder || 'desc';
            query = query.order(sortBy, { ascending: sortOrder === 'asc' });

            const { data, error } = await query;

            if (error) {
                return [];
            }

            const list = data || [];
            
            // Collect user_ids we need to resolve (both from assigned_to and legacy assignee_vendor_id)
            const userIds = Array.from(
                new Set([
                    ...list
                        .filter(t => t.assigned_to_type === 'user_id' && t.assigned_to)
                        .map(t => t.assigned_to),
                    ...list
                        .filter(t => !t.assigned_to_type && t.assigned_to && t.assigned_to.length === 36)
                        .map(t => t.assigned_to)
                ])
            );
            
            // Fetch names/emails from profiles
            let profilesById = {};
            if (userIds.length) {
                const { data: profs, error: profErr } = await window.supabaseClient
                    .from('profiles')
                    .select('id, first_name, last_name, email')
                    .in('id', userIds);
                    
                if (!profErr && profs) {
                    profilesById = Object.fromEntries(
                        profs.map(p => {
                            const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
                            return [p.id, name || p.email || p.id];
                        })
                    );
                }
            }
            
            // Collect vendor profile IDs for vendor assignments
            const vendorIds = Array.from(
                new Set(list.filter(t => t.assignee_vendor_id).map(t => t.assignee_vendor_id))
            );
            
            let vendorsById = {};
            if (vendorIds.length) {
                const { data: vendors, error: vendorErr } = await window.supabaseClient
                    .from('vendor_profiles')
                    .select('id, name, company')
                    .in('id', vendorIds);
                    
                if (!vendorErr && vendors) {
                    vendorsById = Object.fromEntries(
                        vendors.map(v => [v.id, v.name || v.company || v.id])
                    );
                }
            }
            
            // Attach assigned_label to each task with comprehensive logic
            list.forEach(t => {
                // Handle vendor assignments first
                if (t.assignee_vendor_id && vendorsById[t.assignee_vendor_id]) {
                    t.assigned_label = vendorsById[t.assignee_vendor_id];
                }
                // Handle typed assignments
                else if (t.assigned_to_type === 'user_id' && t.assigned_to) {
                    t.assigned_label = profilesById[t.assigned_to] || t.assigned_to;
                } else if (t.assigned_to_type === 'pending_email') {
                    t.assigned_label = t.assigned_to || null;
                } else if (t.assigned_to_type === 'free_text') {
                    t.assigned_label = t.assigned_to || null;
                }
                // Handle legacy assignments without type (try UUID lookup)
                else if (t.assigned_to && !t.assigned_to_type) {
                    // If it looks like a UUID, try to resolve it
                    if (t.assigned_to.length === 36 && profilesById[t.assigned_to]) {
                        t.assigned_label = profilesById[t.assigned_to];
                    } else {
                        // Treat as free text
                        t.assigned_label = t.assigned_to;
                    }
                }
                // No assignment
                else {
                    t.assigned_label = null;
                }
            });

            return list;
        } catch (error) {
            return [];
        }
    },

    // Get tasks assigned to a vendor with pagination
    async getVendorTasks(vendorId, options = {}) {
        try {

            if (!window.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            let query = window.supabaseClient
                .from('tasks')
                .select(`
                    *,
                    events!event_id(
                        id,
                        name,
                        date,
                        location
                    )
                `)
                .eq('assignee_vendor_id', vendorId)
                .eq('visible_to_vendor', true);

            // Apply filters
            if (options.status) {
                query = query.eq('status', options.status);
            }
            if (options.event_id) {
                query = query.eq('event_id', options.event_id);
            }

            // Apply pagination
            const limit = options.limit || 50;
            const offset = options.offset || 0;
            query = query.range(offset, offset + limit - 1);

            // Apply sorting
            const sortBy = options.sortBy || 'due_date';
            const sortOrder = options.sortOrder || 'asc';
            query = query.order(sortBy, { ascending: sortOrder === 'asc' });

            const { data, error } = await query;

            if (error) {
                return [];
            }

            return data || [];
        } catch (error) {
            return [];
        }
    },

    // Delete a task
    async deleteTask(taskId) {
        try {

            const { error } = await window.supabaseClient
                .from('tasks')
                .delete()
                .eq('id', taskId);

            if (error) {
                throw new Error(`Failed to delete task: ${error.message}`);
            }

            return true;
        } catch (error) {
            throw error;
        }
    },

    // Get task summary for an event
    async getEventTaskSummary(eventId) {
        try {
            const { data, error } = await window.supabaseClient
                .rpc('get_event_task_summary', { event_uuid: eventId });

            if (error) {
                return null;
            }

            return data?.[0] || null;
        } catch (error) {
            return null;
        }
    },

    // Get task summary for a vendor
    async getVendorTaskSummary(vendorId) {
        try {
            const { data, error } = await window.supabaseClient
                .rpc('get_vendor_task_summary', { vendor_uuid: vendorId });

            if (error) {
                return null;
            }

            return data?.[0] || null;
        } catch (error) {
            return null;
        }
    },

    // Bulk operations for efficiency
    async bulkUpdateTasks(taskIds, updates) {
        try {

            const { data, error } = await window.supabaseClient
                .from('tasks')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .in('id', taskIds)
                .select();

            if (error) {
                throw new Error(`Failed to bulk update tasks: ${error.message}`);
            }

            return data || [];
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
    },

    // Send task assignment email with token
    async sendTaskAssignmentEmailWithToken(taskData, createdTask, assignmentToken) {
        try {
            
            // Get assignee email from profiles table
            const { data: profileData, error: profileError } = await window.supabaseClient
                .from('profiles')
                .select('email, first_name, last_name')
                .eq('id', taskData.assigned_to)
                .single();
            
            if (profileError || !profileData?.email) {
                return;
            }
            
            // Get event details
            const { data: eventData, error: eventError } = await window.supabaseClient
                .from('events')
                .select('title, name')
                .eq('id', taskData.event_id)
                .single();
            
            const eventName = eventData?.title || eventData?.name || 'Event';
            
            // Get current user (task creator) details
            const session = await window.supabaseClient.auth.getSession();
            const { data: creatorData } = await window.supabaseClient
                .from('profiles')
                .select('first_name, last_name, email')
                .eq('id', session?.data?.session?.user?.id)
                .single();
            
            const creatorName = creatorData 
                ? [creatorData.first_name, creatorData.last_name].filter(Boolean).join(' ') || creatorData.email
                : 'Event Organizer';
            
                // Send email notification using unified notification service
                try {
                    const taskEmailData = {
                        event_id: taskData.event_id,
                        title: taskData.title,
                        description: taskData.description,
                        due_date: taskData.due_date,
                        start_date: taskData.start_date,
                        priority: taskData.priority,
                        assignment_token: assignmentToken
                    };
                    
                    // Debug: Log the task data being sent to email
                    console.log('🔍 TaskAPI email debug - start_date:', taskData.start_date);
                    console.log('🔍 TaskAPI email debug - due_date:', taskData.due_date);
                    console.log('🔍 TaskAPI email debug - full data:', JSON.stringify(taskEmailData, null, 2));
                    
                    const emailResult = await window.unifiedNotificationService.sendTaskAssignmentEmail(
                        profileData.email,
                        creatorName,
                        eventName,
                        taskEmailData
                    );
                console.log('✅ Task assignment email sent via unified service:', emailResult);
                return emailResult;
            } catch (emailError) {
                console.error('❌ Task assignment email failed (non-blocking):', emailError);
                // Don't fail task creation if email fails
            }
        } catch (error) {
            throw error;
        }
    },

    // Alias for getEventTasks for compatibility
    async getTasks(eventId, options = {}) {
        return this.getEventTasks(eventId, options);
    }
};

// Make TaskAPI available globally
window.taskAPI = window.TaskAPI;

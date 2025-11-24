// Notification API functions
const notificationAPI = {
    // Generate unique task assignment token
    generateTaskAssignmentToken() {
        const timestamp = Date.now().toString();
        const randomStr = Math.random().toString(36).substring(2, 15);
        return `task_${randomStr}_${timestamp}`;
    },

    // Create a new notification with email integration
    async createNotification(notificationData, sendEmail = false) {
        try {
            if (!window.supabaseClient) {
                return null;
            }

            // Validate required fields
            if (!notificationData.user_id && !notificationData.userId) {
                return null;
            }
            if (!notificationData.type || !notificationData.title) {
                return null;
            }

            const initialMetadata = {
                ...(notificationData.metadata || {})
            };

            const insertPayload = {
                user_id: notificationData.userId || notificationData.user_id,
                type: notificationData.type,
                title: notificationData.title,
                message: notificationData.message || '',
                event_id: notificationData.eventId || notificationData.event_id || null,
                metadata: initialMetadata
            };

            // Add task assignment token for task notifications
            if (notificationData.type === 'task_assigned' || notificationData.type === 'task_assignment') {
                insertPayload.task_assignment_token = this.generateTaskAssignmentToken();
                insertPayload.assignment_status = 'pending';
                insertPayload.metadata.task_assignment_token = insertPayload.task_assignment_token;
            }

            if (notificationData.relatedId && insertPayload.metadata) {
                insertPayload.metadata.related_id = notificationData.relatedId;
            }

            insertPayload.metadata = this.enrichMetadata(
                insertPayload.type,
                insertPayload.event_id,
                insertPayload.metadata
            );


            const { data, error } = await window.supabaseClient
                .from('notifications')
                .insert([insertPayload])
                .select()
                .single();

            if (error) {
                console.error('Notification creation failed:', {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint
                });
                
                if (error.code === '42501') {
                } else if (error.code === '42883') {
                }
                
                return null;
            }


            // Dispatch event for real-time UI updates
            if (window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('notificationCreated', { 
                    detail: { notification: data } 
                }));
            }

            return data;
        } catch (error) {
            return null;
        }
    },

    getNotificationLink({ type, eventId, metadata } = {}) {
        try {
            if (window.NotificationLinkUtils && typeof window.NotificationLinkUtils.getNotificationLink === 'function') {
                return window.NotificationLinkUtils.getNotificationLink({ type, eventId, metadata });
            }
        } catch (error) {
            console.warn('notificationAPI.getNotificationLink fallback triggered:', error);
        }

        if (eventId) {
            const base = window.NotificationLinkUtils && typeof window.NotificationLinkUtils.buildFullUrl === 'function'
                ? window.NotificationLinkUtils.buildFullUrl(`#/event/view/${eventId}`)
                : `https://revayahost.com/#/event/view/${eventId}`;
            return {
                hash: `#/event/view/${eventId}`,
                searchParams: {},
                url: base,
                intent: 'view'
            };
        }

        return null;
    },

    enrichMetadata(type, eventId, metadata = {}) {
        const meta = metadata ? { ...metadata } : {};
        const link = this.getNotificationLink({ type, eventId, metadata: meta });

        if (link) {
            meta.link = link;
            if (link.url && !meta.url) meta.url = link.url;
            if (link.hash && !meta.hash) meta.hash = link.hash;
            if (link.intent && !meta.intent) meta.intent = link.intent;
        }

        return meta;
    },

    enrichPayload(payload = {}) {
        if (!payload) return payload;
        const enriched = { ...payload };
        const eventId = payload.event_id || payload.eventId || payload.eventID || null;
        enriched.metadata = this.enrichMetadata(payload.type, eventId, payload.metadata || {});
        return enriched;
    },

    // Send email notification based on type and user preferences
    async sendEmailNotification(notification) {
        try {
            // Get user email preferences
            const { data: profile } = await window.supabaseClient
                .from('profiles')
                .select('email, email_notifications')
                .eq('id', notification.user_id)
                .single();

            if (!profile || !profile.email_notifications) {
                return; // User has disabled email notifications
            }

            const emailTemplate = this.getEmailTemplate(notification);
            
            // Log email content (replace with actual email service)
            console.log('Email notification:', {
                to: profile.email,
                subject: emailTemplate.subject,
                body: emailTemplate.body
            });

        } catch (error) {
        }
    },

    // Get email template based on notification type
    getEmailTemplate(notification) {
        const templates = {
            message: {
                subject: `New Message - ${notification.title}`,
                body: `You have received a new message: ${notification.message}`
            },
            invitation: {
                subject: `Event Invitation - ${notification.title}`,
                body: `You have been invited to an event: ${notification.message}`
            },
            task: {
                subject: `Task Assignment - ${notification.title}`,
                body: `A new task has been assigned to you: ${notification.message}`
            },
            event_update: {
                subject: `Event Update - ${notification.title}`,
                body: `An event has been updated: ${notification.message}`
            },
            default: {
                subject: notification.title,
                body: notification.message
            }
        };

        return templates[notification.type] || templates.default;
    },

    // Real-time notification subscription
    subscribeToNotifications(userId, onNotification) {
        const subscription = window.supabaseClient
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    onNotification(payload.new);
                }
            )
            .subscribe();

        return subscription;
    },

    // Unsubscribe from notifications
    unsubscribeFromNotifications(subscription) {
        if (subscription) {
            window.supabaseClient.removeChannel(subscription);
        }
    },

    // Get user notifications
    async getUserNotifications(userId, limit = 50, offset = 0) {
        try {
            const { data, error } = await window.supabaseClient
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                return [];
            }
            return data || [];
        } catch (error) {
            return [];
        }
    },

    // Get unread notification count
    async getUnreadCount(userId) {
        try {
            const { count, error } = await window.supabaseClient
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('read_status', false);

            if (error) {
                return 0;
            }
            return count || 0;
        } catch (error) {
            return 0;
        }
    },

    // Mark notification as read
    async markAsRead(notificationId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('notifications')
                .update({ read_status: true })
                .eq('id', notificationId)
                .select()
                .single();

            if (error) {
                return null;
            }
            return data;
        } catch (error) {
            return null;
        }
    },

    // Mark all notifications as read
    async markAllAsRead(userId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('notifications')
                .update({ read_status: true })
                .eq('user_id', userId)
                .eq('read_status', false);

            if (error) {
                return null;
            }
            return data;
        } catch (error) {
            return null;
        }
    },

    // Get notification preferences
    async getPreferences(userId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('notification_preferences')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            
            // Return default preferences if none exist
            if (!data) {
                return {
                    email_messages: true,
                    email_invitations: true,
                    email_tasks: true,
                    email_events: true,
                    email_system: true
                };
            }
            
            return data;
        } catch (error) {
            throw error;
        }
    },

    // Update notification preferences
    async updatePreferences(userId, preferences) {
        try {
            const { data, error } = await window.supabaseClient
                .from('notification_preferences')
                .upsert({
                    user_id: userId,
                    ...preferences,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            throw error;
        }
    },

    // Helper functions for creating specific notification types
    async createMessageNotification(recipientId, senderId, eventId, messageContent) {
        const { data: sender } = await window.supabaseClient
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', senderId)
            .single();

        const senderName = sender ? `${sender.first_name} ${sender.last_name}` : 'Someone';

        return this.createNotification({
            userId: recipientId,
            type: 'message',
            title: `New message from ${senderName}`,
            message: messageContent.length > 100 ? messageContent.substring(0, 100) + '...' : messageContent,
            eventId: eventId,
            relatedId: senderId
        });
    },

    async createTaskNotification(assignedToUserId, eventId, taskTitle, taskDescription) {
        // Simplified - directly use the user_id if provided
        if (!assignedToUserId) {
            return null;
        }

        return this.createNotification({
            userId: assignedToUserId,
            type: 'task_assigned',
            title: `New task assigned: ${taskTitle}`,
            message: taskDescription || 'A new task has been assigned to you.',
            eventId: eventId
        });
    },

    async createEventUpdateNotification(userId, eventId, updateType, updateDetails) {
        const titles = {
            date_changed: 'Event date updated',
            location_changed: 'Event location updated',
            budget_changed: 'Event budget updated',
            details_changed: 'Event details updated'
        };

        return this.createNotification({
            userId: userId,
            type: 'event_update',
            title: titles[updateType] || 'Event updated',
            message: updateDetails,
            eventId: eventId,
            relatedId: eventId
        });
    },

    async createInvitationNotification(userId, eventId, eventName, inviterName) {
        return this.createNotification({
            userId: userId,
            type: 'invitation',
            title: `Event invitation: ${eventName}`,
            message: `${inviterName} has invited you to participate in ${eventName}`,
            eventId: eventId,
            relatedId: eventId
        });
    },

    // Get task assignment by token
    async getTaskAssignmentByToken(token) {
        try {
            
            const { data, error } = await window.supabaseClient
                .rpc('get_task_assignment_by_token', { 
                    assignment_token: token 
                });

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            throw error;
        }
    },

    // Accept or decline task assignment
    async acceptTaskAssignment(token, responseType = 'accepted', responseMessage = null) {
        try {
            
            const { data, error } = await window.supabaseClient
                .rpc('accept_task_assignment', {
                    assignment_token: token,
                    response_type: responseType,
                    response_message: responseMessage
                });

            if (error) {
                throw error;
            }

            
            // Dispatch event for real-time updates
            if (window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('taskAssignmentResponded', { 
                    detail: data 
                }));
            }
            
            return data;
        } catch (error) {
            throw error;
        }
    },

    // Get task assignment responses for an event
    async getTaskAssignmentResponses(eventId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('task_assignment_responses')
                .select(`
                    *,
                    notification:notifications(title, message, created_at)
                `)
                .eq('event_id', eventId)
                .order('responded_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            return [];
        }
    }
};

// Export for use in other files
window.notificationAPI = notificationAPI;

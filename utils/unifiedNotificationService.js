// Unified Email Notification Service
// Handles all notification types through a single edge function with rate limiting

const unifiedNotificationService = {
  
  // Rate limiting helper for chat messages
  getRateLimitKey(userId, eventId) {
    return `chat_notification_${userId}_${eventId}`;
  },

  // Check if user can receive chat notification (8-hour rate limit)
  canSendChatNotification(userId, eventId) {
    const key = this.getRateLimitKey(userId, eventId);
    const lastNotification = localStorage.getItem(key);
    
    if (!lastNotification) {
      return true; // First notification
    }
    
    const lastTime = parseInt(lastNotification);
    const now = Date.now();
    const eightHours = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    
    return (now - lastTime) >= eightHours;
  },

  // Update rate limit timestamp for chat notifications
  updateChatNotificationTime(userId, eventId) {
    const key = this.getRateLimitKey(userId, eventId);
    localStorage.setItem(key, Date.now().toString());
  },

  // Send any type of notification
  async sendNotification(notificationData) {
    try {
      // Sending notification
      
      // Call the unified edge function
      const { data, error } = await window.supabaseClient.functions.invoke('send-notification-email', {
        body: notificationData
      });

      if (error) {
        console.error('❌ Notification failed:', error);
        throw error;
      }

      // Notification sent successfully
      return data;
      
    } catch (error) {
      console.error('❌ Notification service error:', error);
      throw error;
    }
  },

  // Task assignment notification
  async sendTaskAssignmentEmail(assigneeEmail, assignerName, eventName, taskData) {
    try {
      const notificationData = {
        email: assigneeEmail,
        notification_type: 'task_assigned',
        event_id: taskData.event_id,
        event_name: eventName,
        assigner_name: assignerName,
        task_title: taskData.title,
        task_description: taskData.description,
        due_date: taskData.due_date,
        priority: taskData.priority,
        task_assignment_token: taskData.assignment_token || taskData.task_assignment_token
      };

      return await this.sendNotification(notificationData);
    } catch (error) {
      console.error('❌ Task assignment email failed:', error);
      // Don't throw - email failure shouldn't break task creation
    }
  },

  // Collaborator invitation notification
  async sendCollaboratorInvitationEmail(email, inviterName, eventId, eventName, invitationToken, permissionLevel = 'viewer') {
    try {
      // Always use the unified notification service for consistency
      const notificationData = {
        email: email,
        notification_type: 'collaborator_invitation',
        event_id: eventId,
        event_name: eventName,
        inviter_name: inviterName,
        invitation_token: invitationToken,
        permission_level: permissionLevel
      };

      return await this.sendNotification(notificationData);
    } catch (error) {
      console.error('❌ Collaborator invitation email failed:', error);
      // Don't throw - email failure shouldn't break invitation creation
    }
  },

  // Chat message notification with rate limiting
  async sendChatMessageEmail(email, senderName, eventName, eventId, messagePreview, userId) {
    try {
      // Check rate limiting for chat notifications
      if (!this.canSendChatNotification(userId, eventId)) {
        // Chat email skipped due to rate limiting
        return { skipped: true, reason: 'rate_limited' };
      }

      const notificationData = {
        email: email,
        notification_type: 'chat_message',
        event_id: eventId,
        event_name: eventName,
        sender_name: senderName,
        message_preview: messagePreview
      };

      const result = await this.sendNotification(notificationData);
      
      // Update rate limit timestamp on successful send
      this.updateChatNotificationTime(userId, eventId);
      
      return result;
    } catch (error) {
      console.error('❌ Chat message email failed:', error);
      // Don't throw - email failure shouldn't break messaging
    }
  },

  // Event update notification
  async sendEventUpdateEmail(email, eventName, eventId, updateType, updatedBy, updateDescription) {
    try {
      const notificationData = {
        email: email,
        notification_type: 'event_updated',
        event_id: eventId,
        event_name: eventName,
        update_type: updateType,
        updated_by: updatedBy,
        update_description: updateDescription
      };

      return await this.sendNotification(notificationData);
    } catch (error) {
      console.error('❌ Event update email failed:', error);
      // Don't throw - email failure shouldn't break event updates
    }
  },

  // Collaborator status change notification
  async sendCollaboratorStatusChangeEmail(email, eventName, eventId, statusChange, updatedBy, statusDescription) {
    try {
      console.log('📧 sendCollaboratorStatusChangeEmail called with:', {
        email, eventName, eventId, statusChange, updatedBy, statusDescription
      });
      
      const notificationData = {
        email: email,
        notification_type: 'collaborator_status_changed',
        event_id: eventId,
        event_name: eventName,
        status_change: statusChange,
        updated_by: updatedBy,
        status_description: statusDescription
      };

      console.log('📤 Calling sendNotification with data:', notificationData);
      const result = await this.sendNotification(notificationData);
      console.log('📧 sendNotification result:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Collaborator status change email failed:', error);
      // Don't throw - email failure shouldn't break status changes
    }
  },

  // Vendor invitation notification
  async sendVendorInvitationEmail(email, vendorName, eventId, eventName, acceptUrl, declineUrl) {
    try {
      const notificationData = {
        email: email,
        notification_type: 'vendor_invitation',
        event_id: eventId,
        event_name: eventName,
        vendor_name: vendorName,
        accept_url: acceptUrl,
        decline_url: declineUrl
      };

      return await this.sendNotification(notificationData);
    } catch (error) {
      console.error('❌ Vendor invitation email failed:', error);
      // Don't throw - email failure shouldn't break vendor invitations
    }
  },

  // Helper method to get current user ID for rate limiting
  getCurrentUserId() {
    try {
      const user = window.supabaseClient.auth.getUser();
      return user?.data?.user?.id || 'anonymous';
    } catch (error) {
      console.error('❌ Could not get current user ID:', error);
      return 'anonymous';
    }
  },

  // Helper method to send notifications to multiple users
  async sendToMultipleUsers(notificationData, userEmails) {
    const results = [];
    
    for (const email of userEmails) {
      try {
        const result = await this.sendNotification({
          ...notificationData,
          email: email
        });
        results.push({ email, success: true, result });
      } catch (error) {
        console.error(`❌ Failed to send notification to ${email}:`, error);
        results.push({ email, success: false, error: error.message });
      }
    }
    
    return results;
  },

  // Helper method for event collaborators
  async sendToEventCollaborators(eventId, notificationData) {
    try {
      // Get all collaborators for the event
      const { data: collaborators, error } = await window.supabaseClient
        .from('event_user_roles')
        .select('user_id, profiles(email)')
        .eq('event_id', eventId);

      if (error) {
        console.error('❌ Failed to get event collaborators:', error);
        return [];
      }

      const userEmails = collaborators
        .filter(c => c.profiles?.email)
        .map(c => c.profiles.email);

      return await this.sendToMultipleUsers(notificationData, userEmails);
    } catch (error) {
      console.error('❌ Failed to send to event collaborators:', error);
      return [];
    }
  }
};

// Make it globally available
window.unifiedNotificationService = unifiedNotificationService;

// Unified Notification Service loaded

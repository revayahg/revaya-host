// NotificationIntegration - Helper for creating notifications across the system
function NotificationIntegration() {
    const { useState, useEffect } = React;

    // Helper function to create invitation notifications
    const createInvitationNotification = async (vendorEmail, eventId, eventName) => {
        try {
            const { data: userData } = await window.supabaseClient
                .from('profiles')
                .select('id')
                .eq('email', vendorEmail)
                .single();

            if (userData && window.notificationAPI) {
                await window.notificationAPI.createNotification({
                    userId: userData.id,
                    type: 'invitation',
                    title: 'Event Invitation Received',
                    message: `You've been invited to participate in "${eventName}"`,
                    eventId: eventId,
                    relatedId: null
                });
            }
        } catch (error) {
        }
    };

    // Helper function to create task notifications
    const createTaskNotification = async (vendorProfileId, eventId, taskTitle, type = 'task_assigned') => {
        try {
            const { data: vendorProfile } = await window.supabaseClient
                .from('vendor_profiles')
                .select('user_id, name, company')
                .eq('id', vendorProfileId)
                .single();

            if (vendorProfile?.user_id && window.notificationAPI) {
                const message = type === 'task_assigned' 
                    ? `You've been assigned a new task: "${taskTitle}"`
                    : `Task "${taskTitle}" has been updated`;

                await window.notificationAPI.createNotification({
                    userId: vendorProfile.user_id,
                    type: type,
                    title: type === 'task_assigned' ? 'New Task Assigned' : 'Task Updated',
                    message: message,
                    eventId: eventId,
                    relatedId: vendorProfileId
                });
            }
        } catch (error) {
        }
    };

    // Helper function to create message notifications
    const createMessageNotification = async (recipientUserId, senderName, eventId, threadId) => {
        try {
            if (window.notificationAPI) {
                await window.notificationAPI.createNotification({
                    userId: recipientUserId,
                    type: 'message',
                    title: 'New Message',
                    message: `You have a new message from ${senderName}`,
                    eventId: eventId,
                    relatedId: threadId
                });
            }
        } catch (error) {
        }
    };

    // Helper function to create event update notifications
    const createEventUpdateNotification = async (vendorUserId, eventName, changes, eventId) => {
        try {
            if (window.notificationAPI) {
                await window.notificationAPI.createNotification({
                    userId: vendorUserId,
                    type: 'event_update',
                    title: `Event Update: ${eventName}`,
                    message: `Important changes: ${changes.join(', ')}`,
                    eventId: eventId,
                    relatedId: null
                });
            }
        } catch (error) {
        }
    };

    // Helper function to create invitation response notifications
    const createInvitationResponseNotification = async (eventPlannerUserId, vendorName, eventName, response, eventId) => {
        try {
            if (window.notificationAPI) {
                const title = response === 'accepted' ? 'Invitation Accepted' : 'Invitation Declined';
                const message = `${vendorName} has ${response} your invitation to "${eventName}"`;

                await window.notificationAPI.createNotification({
                    userId: eventPlannerUserId,
                    type: 'invitation_response',
                    title: title,
                    message: message,
                    eventId: eventId,
                    relatedId: null
                });
            }
        } catch (error) {
        }
    };

    // Expose helper functions globally
    window.NotificationIntegration = {
        createInvitationNotification,
        createTaskNotification,
        createMessageNotification,
        createEventUpdateNotification,
        createInvitationResponseNotification
    };

    return null; // This is a utility component
}

window.NotificationIntegration = NotificationIntegration;
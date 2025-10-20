// Development Email Mock System
// This replaces real email calls with logging for development

const developmentEmailMock = {
    // Check if we're in development mode
    isDevelopment() {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    },

    // Mock the collaborator invitation email
    async sendCollaboratorInvitation(email, inviterName, eventId, invitationToken, eventName) {
        if (!this.isDevelopment()) {
            return;
        }

        
        // Log to our email test system
        try {
            await window.supabaseClient.rpc('log_email_test', {
                p_email_type: 'collaborator_invitation',
                p_recipient_email: email,
                p_subject: `You're invited to collaborate on ${eventName}`,
                p_template_name: 'collaborator_invitation',
                p_event_id: eventId,
                p_user_id: null,
                p_metadata: {
                    inviter_name: inviterName,
                    invitation_token: invitationToken,
                    event_name: eventName
                }
            });
        } catch (error) {
        }
        
        return { success: true, id: 'mock-' + Date.now() };
    },

    // Mock the task assignment email
    async sendTaskAssignment(email, taskTitle, eventName, assignerName, taskAssignmentToken) {
        if (!this.isDevelopment()) {
            return;
        }

        
        // Log to our email test system
        try {
            await window.supabaseClient.rpc('log_email_test', {
                p_email_type: 'task_assigned',
                p_recipient_email: email,
                p_subject: `New Task Assignment: ${taskTitle}`,
                p_template_name: 'task_assignment',
                p_event_id: null,
                p_user_id: null,
                p_metadata: {
                    task_title: taskTitle,
                    event_name: eventName,
                    assigner_name: assignerName,
                    task_assignment_token: taskAssignmentToken
                }
            });
        } catch (error) {
        }
        
        return { success: true, id: 'mock-' + Date.now() };
    },

    // Mock vendor invitation email
    async sendVendorInvitation(email, vendorName, eventName, invitationToken) {
        if (!this.isDevelopment()) {
            return;
        }

        
        // Log to our email test system
        try {
            await window.supabaseClient.rpc('log_email_test', {
                p_email_type: 'vendor_invitation',
                p_recipient_email: email,
                p_subject: `Vendor Invitation: ${eventName}`,
                p_template_name: 'vendor_invitation',
                p_event_id: null,
                p_user_id: null,
                p_metadata: {
                    vendor_name: vendorName,
                    event_name: eventName,
                    invitation_token: invitationToken
                }
            });
        } catch (error) {
        }
        
        return { success: true, id: 'mock-' + Date.now() };
    },

    // Mock welcome email
    async sendWelcomeEmail(email, userName) {
        if (!this.isDevelopment()) {
            return;
        }

        
        // Log to our email test system
        try {
            await window.supabaseClient.rpc('log_email_test', {
                p_email_type: 'welcome',
                p_recipient_email: email,
                p_subject: 'Welcome to Revaya Host!',
                p_template_name: 'welcome',
                p_event_id: null,
                p_user_id: null,
                p_metadata: {
                    user_name: userName
                }
            });
        } catch (error) {
        }
        
        return { success: true, id: 'mock-' + Date.now() };
    },

    // Mock password reset email
    async sendPasswordReset(email, resetToken) {
        if (!this.isDevelopment()) {
            return;
        }

        
        // Log to our email test system
        try {
            await window.supabaseClient.rpc('log_email_test', {
                p_email_type: 'password_reset',
                p_recipient_email: email,
                p_subject: 'Password Reset Request',
                p_template_name: 'password_reset',
                p_event_id: null,
                p_user_id: null,
                p_metadata: {
                    reset_token: resetToken
                }
            });
        } catch (error) {
        }
        
        return { success: true, id: 'mock-' + Date.now() };
    }
};

// Export for use in other files
window.developmentEmailMock = developmentEmailMock;

// Auto-initialize in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
}

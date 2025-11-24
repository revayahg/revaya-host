// Email Reminder Service
// Handles invitation reminders and onboarding emails

const emailReminderService = {
  
  // Send invitation reminder manually
  async sendInvitationReminder(invitationData) {
    try {
      // Sending invitation reminder
      
      const { data, error } = await window.supabaseClient.functions.invoke('send-invitation-reminder', {
        body: {
          invitation_id: invitationData.invitation_id,
          recipient_email: invitationData.recipient_email,
          event_id: invitationData.event_id,
          event_name: invitationData.event_name,
          inviter_name: invitationData.inviter_name,
          invitation_token: invitationData.invitation_token,
          reminder_count: invitationData.reminder_count || 1
        }
      })

      if (error) {
        console.error('❌ Invitation reminder failed:', error)
        throw error
      }

      // Invitation reminder sent successfully
      return data
      
    } catch (error) {
      console.error('❌ Invitation reminder service error:', error)
      throw error
    }
  },

  // Send onboarding email manually
  async sendOnboardingEmail(userData) {
    try {
      // Sending onboarding email
      
      const { data, error } = await window.supabaseClient.functions.invoke('send-onboarding-email', {
        body: {
          user_id: userData.user_id,
          user_email: userData.user_email,
          user_name: userData.user_name,
          grace_period_days: userData.grace_period_days || 7
        }
      })

      if (error) {
        console.error('❌ Onboarding email failed:', error)
        throw error
      }

      // Onboarding email sent successfully
      return data
      
    } catch (error) {
      console.error('❌ Onboarding email service error:', error)
      throw error
    }
  },

  // Process all pending email reminders (background job)
  async processEmailReminders() {
    try {
      // Processing email reminders
      
      const { data, error } = await window.supabaseClient.functions.invoke('process-email-reminders', {
        body: {}
      })

      if (error) {
        console.error('❌ Email reminder processing failed:', error)
        throw error
      }

      // Email reminder processing completed
      return data
      
    } catch (error) {
      console.error('❌ Email reminder processing error:', error)
      throw error
    }
  },

  // Get invitation reminder history for a specific invitation
  async getInvitationReminderHistory(invitationId) {
    try {
      const { data, error } = await window.supabaseClient
        .from('invitation_reminder_emails')
        .select('*')
        .eq('invitation_id', invitationId)
        .order('sent_at', { ascending: false })

      if (error) throw error
      return data || []
      
    } catch (error) {
      console.error('❌ Failed to get invitation reminder history:', error)
      throw error
    }
  },

  // Get onboarding email history for a specific user
  async getOnboardingEmailHistory(userId) {
    try {
      const { data, error } = await window.supabaseClient
        .from('onboarding_emails')
        .select('*')
        .eq('user_id', userId)

      if (error) throw error
      return data || []
      
    } catch (error) {
      console.error('❌ Failed to get onboarding email history:', error)
      throw error
    }
  },

  // Check if user is eligible for onboarding email
  async isUserEligibleForOnboarding(userId) {
    try {
      // Check if user exists and has no events
      const { data: userEvents } = await window.supabaseClient
        .from('events')
        .select('id')
        .eq('user_id', userId)
        .limit(1)

      // Check if onboarding email already sent
      const { data: onboardingSent } = await window.supabaseClient
        .from('onboarding_emails')
        .select('id')
        .eq('user_id', userId)
        .limit(1)

      return {
        eligible: !userEvents?.length && !onboardingSent?.length,
        hasEvents: !!userEvents?.length,
        onboardingSent: !!onboardingSent?.length
      }
      
    } catch (error) {
      console.error('❌ Failed to check onboarding eligibility:', error)
      return { eligible: false, hasEvents: false, onboardingSent: false }
    }
  },

  // Check if invitation is eligible for reminder
  async isInvitationEligibleForReminder(invitationId) {
    try {
      // Get invitation details
      const { data: invitation } = await window.supabaseClient
        .from('collaborator_invitations')
        .select('status, created_at')
        .eq('id', invitationId)
        .single()

      if (!invitation || invitation.status !== 'pending') {
        return { eligible: false, reason: 'Invitation not pending' }
      }

      // Check reminder count
      const { data: reminders } = await window.supabaseClient
        .from('invitation_reminder_emails')
        .select('reminder_count')
        .eq('invitation_id', invitationId)
        .order('sent_at', { ascending: false })
        .limit(1)

      const reminderCount = reminders?.length ? reminders[0].reminder_count : 0
      
      if (reminderCount >= 3) {
        return { eligible: false, reason: 'Max reminders reached', reminderCount }
      }

      // Check if enough time has passed since last reminder (24 hours)
      const { data: lastReminder } = await window.supabaseClient
        .from('invitation_reminder_emails')
        .select('sent_at')
        .eq('invitation_id', invitationId)
        .order('sent_at', { ascending: false })
        .limit(1)

      if (lastReminder?.length) {
        const lastSent = new Date(lastReminder[0].sent_at)
        const now = new Date()
        const hoursSinceLastReminder = (now - lastSent) / (1000 * 60 * 60)
        
        if (hoursSinceLastReminder < 24) {
          return { 
            eligible: false, 
            reason: 'Too soon since last reminder', 
            hoursRemaining: Math.ceil(24 - hoursSinceLastReminder),
            reminderCount 
          }
        }
      }

      return { 
        eligible: true, 
        reminderCount: reminderCount + 1,
        daysSinceInvitation: Math.floor((Date.now() - new Date(invitation.created_at).getTime()) / (1000 * 60 * 60 * 24))
      }
      
    } catch (error) {
      console.error('❌ Failed to check reminder eligibility:', error)
      return { eligible: false, reason: 'Error checking eligibility' }
    }
  }
}

// Make it globally available
window.emailReminderService = emailReminderService

// Email Reminder Service loaded

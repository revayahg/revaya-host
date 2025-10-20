import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 Starting email reminder processing job...')

    // Initialize Supabase client
    const supabaseUrl = 'https://drhzvzimmmdbsvwhlsxm.supabase.co'
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set')
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const results = {
      invitation_reminders: { processed: 0, sent: 0, skipped: 0 },
      onboarding_emails: { processed: 0, sent: 0, skipped: 0 }
    }

    // Process invitation reminders
    console.log('📧 Processing invitation reminders...')
    
    // Get pending invitations that are older than 2 days and haven't been accepted
    const { data: pendingInvitations, error: invitationsError } = await supabase
      .from('collaborator_invitations')
      .select(`
        id,
        email,
        event_id,
        invitation_token,
        created_at,
        status,
        events!inner(name, user_id),
        profiles!collaborator_invitations_inviter_id_fkey(first_name, last_name, email)
      `)
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()) // Older than 2 days

    if (invitationsError) {
      console.error('❌ Error fetching pending invitations:', invitationsError)
    } else if (pendingInvitations) {
      for (const invitation of pendingInvitations) {
        results.invitation_reminders.processed++
        
        try {
          // Check how many reminders we've already sent for this invitation
          const { data: existingReminders } = await supabase
            .from('invitation_reminder_emails')
            .select('reminder_count')
            .eq('invitation_id', invitation.id)
            .order('sent_at', { ascending: false })
            .limit(1)

          const reminderCount = existingReminders && existingReminders.length > 0 
            ? existingReminders[0].reminder_count + 1 
            : 1

          // Don't send more than 3 reminders
          if (reminderCount > 3) {
            console.log(`📧 Skipping invitation ${invitation.id} - max reminders reached`)
            results.invitation_reminders.skipped++
            continue
          }

          const inviterName = invitation.profiles 
            ? `${invitation.profiles.first_name || ''} ${invitation.profiles.last_name || ''}`.trim() || invitation.profiles.email
            : 'Event Organizer'

          // Send reminder email
          const reminderResponse = await fetch(`${supabaseUrl}/functions/v1/send-invitation-reminder`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              invitation_id: invitation.id,
              recipient_email: invitation.email,
              event_id: invitation.event_id,
              event_name: invitation.events.name,
              inviter_name: inviterName,
              invitation_token: invitation.invitation_token,
              reminder_count: reminderCount
            })
          })

          if (reminderResponse.ok) {
            const result = await reminderResponse.json()
            if (result.skipped) {
              results.invitation_reminders.skipped++
              console.log(`📧 Reminder skipped for ${invitation.email}: ${result.reason}`)
            } else {
              results.invitation_reminders.sent++
              console.log(`✅ Reminder sent to ${invitation.email} (reminder #${reminderCount})`)
            }
          } else {
            console.error(`❌ Failed to send reminder to ${invitation.email}`)
            results.invitation_reminders.skipped++
          }

          // Add delay between emails to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (error) {
          console.error(`❌ Error processing invitation ${invitation.id}:`, error)
          results.invitation_reminders.skipped++
        }
      }
    }

    // Process onboarding emails
    console.log('📧 Processing onboarding emails...')
    
    // Get users who signed up more than 7 days ago but haven't created any events
    const { data: eligibleUsers, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        created_at
      `)
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Older than 7 days
      .not('id', 'in', `(
        SELECT DISTINCT user_id 
        FROM events 
        WHERE user_id IS NOT NULL
      )`)

    if (usersError) {
      console.error('❌ Error fetching eligible users:', usersError)
    } else if (eligibleUsers) {
      for (const user of eligibleUsers) {
        results.onboarding_emails.processed++
        
        try {
          const gracePeriodDays = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
          const userName = user.first_name && user.last_name 
            ? `${user.first_name} ${user.last_name}` 
            : user.first_name || null

          // Send onboarding email
          const onboardingResponse = await fetch(`${supabaseUrl}/functions/v1/send-onboarding-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: user.id,
              user_email: user.email,
              user_name: userName,
              grace_period_days: gracePeriodDays
            })
          })

          if (onboardingResponse.ok) {
            const result = await onboardingResponse.json()
            if (result.skipped) {
              results.onboarding_emails.skipped++
              console.log(`📧 Onboarding email skipped for ${user.email}: ${result.reason}`)
            } else {
              results.onboarding_emails.sent++
              console.log(`✅ Onboarding email sent to ${user.email}`)
            }
          } else {
            console.error(`❌ Failed to send onboarding email to ${user.email}`)
            results.onboarding_emails.skipped++
          }

          // Add delay between emails to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (error) {
          console.error(`❌ Error processing user ${user.id}:`, error)
          results.onboarding_emails.skipped++
        }
      }
    }

    console.log('✅ Email reminder processing completed:', results)

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Job error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

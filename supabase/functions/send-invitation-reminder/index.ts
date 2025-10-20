import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvitationReminderRequest {
  invitation_id: string;
  recipient_email: string;
  event_id: string;
  event_name: string;
  inviter_name: string;
  invitation_token: string;
  reminder_count?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { invitation_id, recipient_email, event_id, event_name, inviter_name, invitation_token, reminder_count = 1 }: InvitationReminderRequest = await req.json()

    console.log('📧 Invitation reminder request:', {
      invitation_id,
      recipient_email,
      event_name,
      reminder_count
    })

    // Validate required fields
    if (!recipient_email || !event_name || !inviter_name || !invitation_token) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = 'https://drhzvzimmmdbsvwhlsxm.supabase.co'
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set')
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if we've already sent a reminder recently (within 24 hours)
    const { data: recentReminder } = await supabase
      .from('invitation_reminder_emails')
      .select('sent_at')
      .eq('recipient_email', recipient_email)
      .eq('invitation_id', invitation_id)
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('sent_at', { ascending: false })
      .limit(1)

    if (recentReminder && recentReminder.length > 0) {
      console.log('📧 Reminder skipped - already sent within 24 hours')
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true, 
          reason: 'Already sent within 24 hours' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate email content based on reminder count
    const subject = reminder_count === 1 
      ? `Reminder: You're invited to collaborate on ${event_name}`
      : `Gentle reminder: Please respond to your invitation for ${event_name}`

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Collaboration Invitation Reminder</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .button:hover { background: #4338ca; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
            .reminder-note { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🔔 Collaboration Invitation Reminder</h1>
        </div>
        
        <div class="content">
            <p>Hi there!</p>
            
            <p><strong>${inviter_name}</strong> invited you to collaborate on their event: <strong>${event_name}</strong></p>
            
            ${reminder_count > 1 ? `
            <div class="reminder-note">
                <strong>Gentle Reminder:</strong> We noticed you haven't responded to this invitation yet. 
                This is reminder #${reminder_count} - we don't want you to miss out on this opportunity!
            </div>
            ` : ''}
            
            <p>As a collaborator, you'll be able to:</p>
            <ul>
                <li>📝 Help plan and organize the event</li>
                <li>💬 Join the event team chat</li>
                <li>✅ View and manage tasks</li>
                <li>💰 Collaborate on budget planning</li>
            </ul>
            
            <div style="text-align: center;">
                <a href="https://revayahost.com/#/collaborator-invite-response?token=${invitation_token}" class="button">
                    ${reminder_count === 1 ? 'View Invitation' : 'Respond to Invitation'}
                </a>
            </div>
            
            <p><small>This invitation link is secure and will remain valid. If you're not interested in collaborating on this event, you can simply ignore this email.</small></p>
        </div>
        
        <div class="footer">
            <p>This is an automated reminder from Revaya Host.<br>
            If you have any questions, please contact ${inviter_name} directly.</p>
        </div>
    </body>
    </html>
    `

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'info@revayahg.com',
        to: [recipient_email],
        subject: subject,
        html: htmlContent,
      }),
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text()
      console.error('❌ Resend API error:', errorData)
      throw new Error(`Failed to send email: ${emailResponse.status} - ${errorData}`)
    }

    const emailResult = await emailResponse.json()
    console.log('✅ Invitation reminder email sent:', emailResult)

    // Record the reminder email in our tracking table
    const { error: trackingError } = await supabase
      .from('invitation_reminder_emails')
      .insert({
        invitation_id,
        recipient_email,
        event_id,
        event_name,
        inviter_name,
        invitation_token,
        reminder_count
      })

    if (trackingError) {
      console.error('❌ Failed to track reminder email:', trackingError)
      // Don't fail the request if tracking fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_id: emailResult.id,
        reminder_count 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OnboardingEmailRequest {
  user_id: string;
  user_email: string;
  user_name?: string;
  grace_period_days?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, user_email, user_name, grace_period_days = 7 }: OnboardingEmailRequest = await req.json()

    console.log('📧 Onboarding email request:', {
      user_id,
      user_email,
      user_name,
      grace_period_days
    })

    // Validate required fields
    if (!user_id || !user_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id and user_email' }),
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

    // Check if we've already sent an onboarding email to this user
    const { data: existingEmail } = await supabase
      .from('onboarding_emails')
      .select('id')
      .eq('user_id', user_id)
      .limit(1)

    if (existingEmail && existingEmail.length > 0) {
      console.log('📧 Onboarding email skipped - already sent to this user')
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true, 
          reason: 'Onboarding email already sent to this user' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user has created any events
    const { data: userEvents } = await supabase
      .from('events')
      .select('id')
      .eq('user_id', user_id)
      .limit(1)

    if (userEvents && userEvents.length > 0) {
      console.log('📧 Onboarding email skipped - user already has events')
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true, 
          reason: 'User already has events' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const displayName = user_name || user_email.split('@')[0]
    const subject = `Welcome to Revaya Host! Let's create your first event 🎉`

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Revaya Host</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .step { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #4f46e5; }
            .step-number { background: #4f46e5; color: white; border-radius: 50%; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; }
            .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .button:hover { background: #4338ca; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
            .highlight { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🎉 Welcome to Revaya Host!</h1>
            <p>Hi ${displayName}, you're all set to start planning amazing events</p>
        </div>
        
        <div class="content">
            <p>We noticed you signed up ${grace_period_days} days ago but haven't created your first event yet. No worries - let's get you started with these simple steps:</p>
            
            <div class="step">
                <span class="step-number">1</span>
                <strong>Click "Create Event"</strong>
                <p>Log into your Revaya Host dashboard and click the "Create Event" button to get started.</p>
            </div>
            
            <div class="step">
                <span class="step-number">2</span>
                <strong>Fill in Event Details</strong>
                <p>Add your event name, date, location, and description. Don't worry about perfection - you can always edit later!</p>
            </div>
            
            <div class="step">
                <span class="step-number">3</span>
                <strong>Invite Collaborators</strong>
                <p>Add team members, vendors, or anyone else who needs to help plan your event. They'll get instant access to collaborate with you.</p>
            </div>
            
            <div class="highlight">
                <strong>💡 Pro Tip:</strong> Start with a simple event setup. You can always add more details, budgets, tasks, and collaborators as your planning progresses!
            </div>
            
            <div style="text-align: center;">
                <a href="https://revayahost.com/#/dashboard" class="button">
                    Go to Dashboard
                </a>
            </div>
            
            <h3>What makes Revaya Host special?</h3>
            <ul>
                <li>🎯 <strong>Collaborative Planning:</strong> Invite your team to help plan every detail</li>
                <li>💰 <strong>Budget Management:</strong> Track expenses and keep your event on budget</li>
                <li>✅ <strong>Task Organization:</strong> Break down your event into manageable tasks</li>
                <li>💬 <strong>Team Communication:</strong> Built-in chat for seamless collaboration</li>
                <li>🏢 <strong>Vendor Network:</strong> Connect with trusted event professionals</li>
            </ul>
            
            <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team.</p>
        </div>
        
        <div class="footer">
            <p>Happy planning!<br>
            The Revaya Host Team</p>
            <p><small>If you're not interested in receiving these emails, you can <a href="#">unsubscribe here</a>.</small></p>
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
        to: [user_email],
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
    console.log('✅ Onboarding email sent:', emailResult)

    // Record the onboarding email in our tracking table
    const { error: trackingError } = await supabase
      .from('onboarding_emails')
      .insert({
        user_id,
        user_email,
        user_name,
        grace_period_days
      })

    if (trackingError) {
      console.error('❌ Failed to track onboarding email:', trackingError)
      // Don't fail the request if tracking fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_id: emailResult.id,
        user_name: displayName
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

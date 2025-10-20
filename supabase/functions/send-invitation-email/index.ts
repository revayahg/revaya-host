import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Universal Email Template Function - Compatible with ALL email clients
function createUniversalInvitationEmail(text = 'You have been invited to participate in an event on Revaya Host.') {
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Event Invitation</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        /* Reset styles for email clients */
        body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
        }
        
        /* Outlook-specific fixes */
        .outlook-group-fix { width: 100%; }
        
        /* Mobile responsive */
        @media only screen and (max-width: 600px) {
            .mobile-center { text-align: center !important; }
            .mobile-padding { padding: 15px !important; }
            .mobile-font-large { font-size: 20px !important; }
            .mobile-font-small { font-size: 14px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, sans-serif;">
    <!-- Preheader text -->
    <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        You're invited to participate in an event
    </div>
    
    <!-- Main email table -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
        <tr>
            <td align="center" style="padding: 20px 10px;">
                <!-- Email container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 30px 20px 20px; background-color: #667eea;">
                            <!-- Logo -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="background-color: #4c51bf; width: 60px; height: 60px; border-radius: 50%; font-size: 24px; font-weight: bold; color: #ffffff; line-height: 60px;">
                                        RH
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Title -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 20px;">
                                <tr>
                                    <td align="center" style="color: #ffffff; font-size: 28px; font-weight: bold; line-height: 1.2; font-family: Arial, sans-serif;">
                                        🎉 Event Invitation
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="color: #e2e8f0; font-size: 16px; line-height: 1.4; font-family: Arial, sans-serif; padding-top: 8px;">
                                        You're invited to participate
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px 20px; background-color: #ffffff;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="color: #374151; font-size: 16px; line-height: 1.6; font-family: Arial, sans-serif; text-align: left;">
                                        ${text}
                                    </td>
                                </tr>
                                
                                <!-- CTA Button -->
                                <tr>
                                    <td align="center" style="padding: 30px 0 20px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td align="center" style="border-radius: 6px; background-color: #10b981;">
                                                    <a href="#" style="display: inline-block; padding: 14px 28px; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; color: #ffffff; border-radius: 6px; background-color: #10b981;">
                                                        ✅ Accept Invitation
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="color: #6b7280; font-size: 14px; line-height: 1.5; font-family: Arial, sans-serif;">
                                        This invitation was sent via Revaya Host event management platform.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

serve(async (req) => {
  console.log('🚀 Edge function started, method:', req.method)
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📥 Processing request...')
    
    // Validate request body
    let requestBody
    try {
      const rawBody = await req.text()
      console.log('📝 Raw request body length:', rawBody.length)
      requestBody = JSON.parse(rawBody)
      console.log('✅ Request body parsed successfully')
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body',
          status: 'failed',
          details: parseError.message
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { to, subject, html, text, invitationId } = requestBody

    // Log received data for debugging
    console.log('📝 Received request body:', {
      to,
      subject,
      invitationId,
      hasHtml: !!html,
      hasText: !!text
    })

    // Validate required fields
    if (!to || !subject || !invitationId) {
      console.error('❌ Missing required fields:', { 
        to: to || 'missing', 
        subject: subject || 'missing', 
        invitationId: invitationId || 'missing'
      })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: to, subject, invitationId',
          status: 'failed',
          received: { to: !!to, subject: !!subject, invitationId: !!invitationId }
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      console.error('❌ Invalid email format:', to)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid email format',
          status: 'failed',
          receivedEmail: to
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Log the payload we received
    console.log('📨 Received invitation email payload:', {
      to,
      subject,
      htmlPreview: html?.slice(0, 200) + '...',
      textPreview: text?.slice(0, 100) + '...',
      invitationId
    })

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'https://mrjnkoijfrbsapykgfwj.supabase.co'
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    console.log('🔧 Environment check:', {
      supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasResendKey: !!resendApiKey
    })
    
    if (!supabaseServiceKey) {
      console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error - missing service key',
          status: 'failed' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    let supabaseClient
    try {
      supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
      console.log('✅ Supabase client created successfully')
    } catch (clientError) {
      console.error('❌ Failed to create Supabase client:', clientError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database connection failed',
          status: 'failed',
          details: clientError.message
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    let emailSuccess = false
    let emailError = null
    let emailResult = null

    // Send email via Resend if API key is available
    if (resendApiKey && resendApiKey.trim() !== '') {
      try {
        console.log('📧 Attempting to send via Resend to:', to)
        
        // Create universal-compatible HTML email
        const formattedHtml = html || createUniversalInvitationEmail(text);

        const emailPayload = {
          from: 'Revaya Host <info@revayahg.com>',
          to: [to],
          subject,
          html: formattedHtml,
          text: text || 'You have been invited to an event. Please check your email for the invitation details.'
        }
        
        console.log('📦 Email payload prepared:', {
          from: emailPayload.from,
          to: emailPayload.to,
          subject: emailPayload.subject,
          hasHtml: !!emailPayload.html,
          hasText: !!emailPayload.text
        })
        
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailPayload)
        })

        const responseText = await resendResponse.text()
        console.log('📨 Resend API response status:', resendResponse.status)
        console.log('📨 Resend API response body:', responseText)

        if (resendResponse.ok) {
          try {
            emailResult = JSON.parse(responseText)
            console.log('✅ Resend success:', emailResult.id)
            emailSuccess = true
          } catch (parseError) {
            console.error('❌ Failed to parse Resend response:', parseError)
            emailError = `Failed to parse email service response: ${responseText}`
          }
        } else {
          console.error('❌ Resend error:', responseText)
          emailError = `Resend API error: ${resendResponse.status} - ${responseText}`
        }
      } catch (error) {
        console.error('❌ Resend request failed:', error)
        emailError = `Network error: ${error.message}`
      }
    } else {
      // Simulate email sending for development
      console.log('📧 Simulating email send (no RESEND_API_KEY):', { to, subject })
      emailSuccess = true
      emailResult = { 
        id: 'simulated-email-' + Date.now(),
        message: 'Email simulated successfully (no API key configured)' 
      }
    }

    // Update invitation status in database
    try {
      const updateData = {
        email_delivery_status: emailSuccess ? 'sent' : 'failed',
        email_sent_at: new Date().toISOString()
      }
      
      if (emailError) {
        updateData.email_error = String(emailError).slice(0, 500) // Truncate long errors
      }

      console.log('📝 Updating invitation with data:', updateData)

      const { error: updateError } = await supabaseClient
        .from('event_invitations')
        .update(updateData)
        .eq('id', invitationId)

      if (updateError) {
        console.error('❌ Failed to update invitation status:', updateError)
        // Don't fail the request for DB update issues if email was sent
        if (!emailSuccess) {
          return new Response(
            JSON.stringify({
              success: false,
              status: 'failed',
              error: 'Database update failed',
              details: updateError.message
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
      } else {
        console.log('✅ Updated invitation status:', emailSuccess ? 'sent' : 'failed', 'for ID:', invitationId)
      }
    } catch (dbError) {
      console.error('❌ Database update error:', dbError)
      // Continue - don't fail the entire request for DB issues if email succeeded
    }

    // Return success response
    if (emailSuccess) {
      const successResponse = {
        success: true,
        status: 'sent',
        message: 'Email sent successfully',
        data: emailResult,
        invitationId
      }
      console.log('✅ Returning success response:', successResponse)
      return new Response(
        JSON.stringify(successResponse),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      // Return email failure (but valid request)
      const errorResponse = {
        success: false,
        status: 'failed',
        message: 'Email sending failed',
        error: emailError || 'Unknown email error',
        invitationId
      }
      console.log('❌ Returning error response:', errorResponse)
      return new Response(
        JSON.stringify(errorResponse),
        { 
          status: 422, // Unprocessable Entity - valid request but email failed
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('❌ Edge function error:', error)
    console.error('❌ Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Unknown server error',
        status: 'failed',
        errorType: error.constructor.name,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

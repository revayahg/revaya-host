import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

// Secure CORS configuration
const allowedOrigins = [
  'https://revayahost.com',
  'https://www.revayahost.com',
  'https://localhost:8000',
  'http://localhost:8000',
  'https://127.0.0.1:8000',
  'http://127.0.0.1:8000'
]

function getCorsHeaders(origin: string | null) {
  const isAllowed = origin && allowedOrigins.includes(origin)
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true'
  }
}
// Notification type handlers
const notificationHandlers = {
  'task_assigned': {
    subject: (data)=>`New Task Assigned: ${data.task_title}`,
    template: 'task'
  },
  'task_updated': {
    subject: (data)=>`Task Status Updated: ${data.task_title}`,
    template: 'task_update'
  },
  'task_completed': {
    subject: (data)=>`Task Completed: ${data.task_title}`,
    template: 'task_complete'
  },
  'collaborator_invitation': {
    subject: (data)=>`You're invited to collaborate on ${data.event_name}`,
    template: 'invitation'
  },
  'chat_message': {
    subject: (data)=>`New message in ${data.event_name}`,
    template: 'chat'
  },
  'event_updated': {
    subject: (data)=>`Event Updated: ${data.event_name}`,
    template: 'event'
  },
  'collaborator_status_changed': {
    subject: (data)=>`Collaboration Status Update: ${data.event_name}`,
    template: 'status'
  },
  'vendor_invitation': {
    subject: (data)=>`Event Invitation: ${data.event_name}`,
    template: 'vendor'
  }
};
// Universal Email Template Function - Compatible with ALL email clients INCLUDING OUTLOOK DARK MODE
function createUniversalEmail({ title = "Notification", subtitle = "", content = "", preheader = "", buttons = [], footer = "This email was sent via Revaya Host event management platform.", headerColor = "#667eea", buttonColor = "#10b981", logoText = "RH", unsubscribeLink = "" }) {
  // Generate buttons HTML with Outlook dark mode support
  let buttonsHTML = "";
  if (buttons && buttons.length > 0) {
    buttonsHTML = buttons.map((button)=>`
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 5px auto;">
        <tr>
          <td align="center" style="border-radius: 8px; background-color: ${button.color || buttonColor};">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${button.url}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="18%" stroke="f" fillcolor="${button.color || buttonColor}">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${button.text}</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="${button.url}" 
               style="display: inline-block; padding: 14px 28px; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; color: #ffffff !important; border-radius: 8px; background-color: ${button.color || buttonColor}; mso-hide: all;">
              ${button.text}
            </a>
            <!--<![endif]-->
          </td>
        </tr>
      </table>
    `).join("");
  }
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
    <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${title}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <style type="text/css">
        table {border-collapse:collapse;border-spacing:0;margin:0;}
        div, td {padding:0;}
        div {margin:0 !important;}
    </style>
    <![endif]-->
    <style type="text/css">
        /* Reset styles */
        body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            margin: 0;
            padding: 0;
        }
        table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
            border-collapse: collapse;
        }
        img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
        }
        
        /* Force Outlook to provide a "view in browser" link */
        #outlook a {
            padding: 0;
        }
        
        /* Dark mode styles */
        @media (prefers-color-scheme: dark) {
            .dark-mode-bg {
                background-color: #1a1a1a !important;
            }
            .dark-mode-text {
                color: #ffffff !important;
            }
        }
        
        /* Outlook Dark Mode - force colors */
        [data-ogsc] .header-bg {
            background-color: ${headerColor} !important;
        }
        [data-ogsc] .content-bg {
            background-color: #ffffff !important;
        }
        [data-ogsc] .footer-bg {
            background-color: #f9fafb !important;
        }
        [data-ogsc] .text-dark {
            color: #1f2937 !important;
        }
        [data-ogsc] .text-gray {
            color: #4b5563 !important;
        }
        
        /* Mobile responsive */
        @media only screen and (max-width: 600px) {
            .mobile-padding {
                padding: 15px !important;
            }
            .mobile-font-large {
                font-size: 20px !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    <!-- Preheader text -->
    <div style="display: none; font-size: 1px; color: #f8fafc; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
        ${preheader}
        </div>

    <!-- Main email table -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; margin: 0; padding: 0;">
        <tr>
            <td align="center" style="padding: 20px 10px;">
                <!-- Email container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; margin: 0 auto;">
                    
                    <!-- Header with solid color -->
                    <tr>
                        <td align="center" class="header-bg" style="padding: 30px 20px 20px; background-color: ${headerColor};">
                            <!--[if mso]>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                            <td align="center">
                            <![endif]-->
                            
                            <!-- Logo with solid background -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                <tr>
                                    <td align="center" style="background-color: #5046e5; width: 60px; height: 60px; border-radius: 30px; font-size: 24px; font-weight: bold; color: #ffffff; line-height: 60px; text-align: center; mso-line-height-rule: exactly;">
                                        ${logoText}
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Title -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 20px;">
                                <tr>
                                    <td align="center" style="color: #ffffff; font-size: 28px; font-weight: bold; line-height: 1.3; font-family: Arial, sans-serif; padding: 0; mso-line-height-rule: exactly;">
                                        ${title}
                                    </td>
                                </tr>
                                ${subtitle ? `
                                <tr>
                                    <td align="center" style="color: #ffffff; font-size: 16px; line-height: 1.4; font-family: Arial, sans-serif; padding-top: 10px; mso-line-height-rule: exactly;">
                                        ${subtitle}
                                    </td>
                                </tr>
                                ` : ''}
                            </table>
                            
                            <!--[if mso]>
                            </td>
                            </tr>
                            </table>
                            <![endif]-->
                        </td>
                    </tr>
                    
                    <!-- Content with forced colors -->
                    <tr>
                        <td class="content-bg" style="padding: 30px 20px; background-color: #ffffff;">
                            <!--[if mso]>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                            <td>
                            <![endif]-->
                            
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td class="text-dark" style="color: #1f2937; font-size: 16px; line-height: 1.6; font-family: Arial, sans-serif; text-align: left; mso-line-height-rule: exactly;">
                                        ${content}
                                    </td>
                                </tr>
                                
                                <!-- CTA Buttons -->
                                ${buttonsHTML ? `
                                <tr>
                                    <td align="center" style="padding: 30px 0 20px;">
                                        ${buttonsHTML}
                                    </td>
                                </tr>
                                ` : ''}
                            </table>
                            
                            <!--[if mso]>
                            </td>
                            </tr>
                            </table>
                            <![endif]-->
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="footer-bg" style="padding: 20px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                            <!--[if mso]>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                            <td align="center">
                            <![endif]-->
                            
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" class="text-gray" style="color: #6b7280; font-size: 14px; line-height: 1.5; font-family: Arial, sans-serif; mso-line-height-rule: exactly;">
                                        ${footer}
                                        ${unsubscribeLink ? `
                                        <br><br>
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td align="center" style="padding-top: 10px; border-top: 1px solid #e5e7eb; margin-top: 10px;">
                                                    <p style="margin: 10px 0 5px 0; font-size: 12px; color: #6b7280;">
                                                        <a href="${unsubscribeLink}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a>
                                                        &nbsp;•&nbsp;
                                                        <a href="https://www.revayahost.com/#/preferences" style="color:#64748B;text-decoration:underline;">Manage preferences</a>
                                                        <br><br>
                                                        Revaya Hospitality Group LLC • 407 Lincoln Road, Ste 6H, Miami Beach, FL 33139 • 
                                                        <a href="mailto:info@revayahg.com" style="color:#64748B;text-decoration:underline;">info@revayahg.com</a>
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                        ` : ''}
                                    </td>
                                </tr>
                            </table>
                            
                            <!--[if mso]>
                            </td>
                            </tr>
                            </table>
                            <![endif]-->
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    </body>
</html>`;
}
// Email templates using universal template
const emailTemplates = {
  task: (data)=>{
    const contentBox = `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0f4ff; border-left: 4px solid #667eea; margin: 20px 0;">
        <tr>
          <td style="padding: 20px;">
            <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 18px; font-weight: 600; font-family: Arial, sans-serif;">📋 ${data.task_title}</h3>
            ${data.task_description ? `<p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: #1e40af;">Description:</strong> ${data.task_description}</p>` : ''}
            ${data.start_date ? `<p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: #1e40af;">Start Date:</strong> ${new Date(data.start_date).toLocaleDateString()}</p>` : ''}
            ${data.due_date ? `<p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: #1e40af;">Due Date:</strong> ${new Date(data.due_date).toLocaleDateString()}</p>` : ''}
            <p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: #1e40af;">Priority:</strong> ${data.priority || 'medium'}</p>
            <p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: #1e40af;">Event:</strong> ${data.event_name}</p>
            <p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: #1e40af;">Assigned by:</strong> ${data.assigner_name}</p>
          </td>
        </tr>
      </table>
    `;
    return createUniversalEmail({
      title: "📋 Task Assignment",
      subtitle: "You've been assigned a new task!",
      content: `
        <h2 style="color: #1f2937; margin-top: 0; font-size: 20px; font-weight: 600; font-family: Arial, sans-serif;">You've been assigned a new task!</h2>
        ${contentBox}
        <p style="color: #4b5563; font-size: 15px; margin-top: 30px; font-family: Arial, sans-serif;">This task has been assigned to you for the event "${data.event_name}". Click the button above to view full details and update the task status.</p>
      `,
      preheader: `New task assignment: ${data.task_title}`,
      buttons: [
        {
          text: "View Task Details",
          url: data.accept_url,
          color: "#667eea"
        }
      ],
      headerColor: "#667eea",
      buttonColor: "#667eea"
    });
  },
  task_update: (data)=>{
    const contentBox = `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0f4ff; border-left: 4px solid #667eea; margin: 20px 0;">
        <tr>
          <td style="padding: 20px;">
            <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 18px; font-weight: 600; font-family: Arial, sans-serif;">📋 ${data.task_title}</h3>
            <p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: #1e40af;">Event:</strong> ${data.event_name}</p>
            ${data.task_status ? `<p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: #1e40af;">Status:</strong> ${data.task_status}</p>` : ''}
            ${data.task_description ? `<p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: #1e40af;">Description:</strong> ${data.task_description}</p>` : ''}
            ${data.start_date ? `<p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: #1e40af;">Start Date:</strong> ${new Date(data.start_date).toLocaleDateString()}</p>` : ''}
            ${data.due_date ? `<p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: #1e40af;">Due Date:</strong> ${new Date(data.due_date).toLocaleDateString()}</p>` : ''}
          </td>
        </tr>
      </table>
    `;
    return createUniversalEmail({
      title: "📋 Task Update",
      subtitle: "Task status has been updated",
      content: `
        <h2 style="color: #1f2937; margin-top: 0; font-size: 20px; font-weight: 600; font-family: Arial, sans-serif;">${data.title}</h2>
        ${contentBox}
        <p style="color: #4b5563; font-size: 15px; margin-top: 30px; font-family: Arial, sans-serif;">${data.message || 'The task status has been updated.'}</p>
      `,
      preheader: `Task update: ${data.task_title}`,
      buttons: [
        {
          text: "View Task Details",
          url: data.accept_url,
          color: "#667eea"
        }
      ],
      headerColor: "#667eea",
      buttonColor: "#667eea"
    });
  },
  task_complete: (data)=>{
    const contentBox = `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0fdf4; border-left: 4px solid #10b981; margin: 20px 0;">
        <tr>
          <td style="padding: 20px;">
            <h3 style="color: #059669; margin: 0 0 10px 0; font-size: 18px; font-weight: 600; font-family: Arial, sans-serif;">✅ ${data.task_title}</h3>
            <p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: #059669;">Event:</strong> ${data.event_name}</p>
            <p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: #059669;">Status:</strong> <span style="color: #10b981; font-weight: bold;">Completed</span></p>
          </td>
        </tr>
      </table>
    `;
    return createUniversalEmail({
      title: "✅ Task Completed",
      subtitle: "Great job!",
      content: `
        <h2 style="color: #1f2937; margin-top: 0; font-size: 20px; font-weight: 600; font-family: Arial, sans-serif;">Great job!</h2>
        ${contentBox}
        <p style="color: #4b5563; font-size: 15px; margin-top: 30px; font-family: Arial, sans-serif;">The task "${data.task_title}" has been completed for the event "${data.event_name}". Thank you for your hard work!</p>
      `,
      preheader: `Task completed: ${data.task_title}`,
      buttons: [
        {
          text: "View Event Details",
          url: data.accept_url,
          color: "#10b981"
        }
      ],
      headerColor: "#10b981",
      buttonColor: "#10b981"
    });
  },
  invitation: (data)=>{
    const contentBox = `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0f4ff; border-left: 4px solid #667eea; margin: 20px 0;">
        <tr>
          <td style="padding: 20px;">
            <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 18px; font-weight: 600; font-family: Arial, sans-serif;">🤝 Your Role: ${data.permission_level || 'Viewer'}</h3>
            <p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;">
            ${data.permission_level === 'admin' ? 'Full access to edit, manage, and invite others to this event.' : data.permission_level === 'editor' ? 'Can view and edit event details, tasks, and budget.' : 'Can view event details and participate in discussions.'}
          </p>
          </td>
        </tr>
      </table>
    `;
    return createUniversalEmail({
      title: "🤝 Collaboration Invitation",
      subtitle: "You're invited to collaborate!",
      content: `
        <h2 style="color: #1f2937; margin-top: 0; font-size: 20px; font-weight: 600; font-family: Arial, sans-serif;">You're invited to collaborate!</h2>
        <p style="color: #1f2937; font-size: 16px; margin: 20px 0; font-family: Arial, sans-serif;">
          ${data.inviter_name} has invited you to collaborate on the event <strong>${data.event_name}</strong>.
        </p>
        ${contentBox}
        <p style="color: #4b5563; font-size: 15px; margin-top: 30px; font-family: Arial, sans-serif;">Join the collaboration to help plan and manage this event together.</p>
      `,
      preheader: `Collaboration invitation for ${data.event_name}`,
      buttons: [
        {
          text: "Accept Invitation",
          url: data.accept_url,
          color: "#667eea"
        }
      ],
      headerColor: "#667eea",
      buttonColor: "#667eea"
    });
  },
  chat: (data)=>{
    const contentBox = `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0fdf4; border-left: 4px solid #10b981; margin: 20px 0;">
        <tr>
          <td style="padding: 20px;">
            <p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: #059669;">From:</strong> ${data.sender_name}</p>
            <p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: #059669;">Message:</strong> ${data.message_preview}</p>
          </td>
        </tr>
      </table>
    `;
    return createUniversalEmail({
      title: "💬 New Message",
      subtitle: `New message in ${data.event_name}`,
      content: `
        <h2 style="color: #1f2937; margin-top: 0; font-size: 20px; font-weight: 600; font-family: Arial, sans-serif;">New message in ${data.event_name}</h2>
        ${contentBox}
        <p style="color: #4b5563; font-size: 15px; margin-top: 30px; font-family: Arial, sans-serif;">Reply to this message or view the full conversation in the event chat.</p>
      `,
      preheader: `New message from ${data.sender_name}`,
      buttons: [
        {
          text: "View Message",
          url: data.accept_url,
          color: "#10b981"
        }
      ],
      headerColor: "#10b981",
      buttonColor: "#10b981"
    });
  },
  event: (data)=>{
    const contentBox = `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; margin: 20px 0;">
        <tr>
          <td style="padding: 20px;">
            <h3 style="color: #d97706; margin: 0 0 10px 0; font-size: 18px; font-weight: 600; font-family: Arial, sans-serif;">📅 ${data.event_name}</h3>
            <p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: #d97706;">Updated by:</strong> ${data.updated_by || 'Event Organizer'}</p>
            ${data.update_description ? `<p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: #d97706;">Changes:</strong> ${data.update_description}</p>` : ''}
          </td>
        </tr>
      </table>
    `;
    return createUniversalEmail({
      title: "📅 Event Update",
      subtitle: "Event details have been updated",
      content: `
        <h2 style="color: #1f2937; margin-top: 0; font-size: 20px; font-weight: 600; font-family: Arial, sans-serif;">Event details have been updated</h2>
        ${contentBox}
        <p style="color: #4b5563; font-size: 15px; margin-top: 30px; font-family: Arial, sans-serif;">Check the updated event details to stay informed about any changes.</p>
      `,
      preheader: `Event update: ${data.event_name}`,
      buttons: [
        {
          text: "View Event",
          url: data.accept_url,
          color: "#f59e0b"
        }
      ],
      headerColor: "#f59e0b",
      buttonColor: "#f59e0b"
    });
  },
  status: (data)=>{
    const isAccepted = data.status_change && data.status_change.toLowerCase().includes('accepted');
    const isDeclined = data.status_change && data.status_change.toLowerCase().includes('declined');
    const headerColor = isAccepted ? '#10b981' : isDeclined ? '#ef4444' : '#667eea';
    const buttonColor = isAccepted ? '#10b981' : isDeclined ? '#ef4444' : '#667eea';
    const emoji = isAccepted ? '✅' : isDeclined ? '❌' : '🤝';
    const bgColor = isAccepted ? '#f0fdf4' : isDeclined ? '#fef2f2' : '#f0f4ff';
    const accentColor = isAccepted ? '#059669' : isDeclined ? '#dc2626' : '#1e40af';
    const contentBox = `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${bgColor}; border-left: 4px solid ${headerColor}; margin: 20px 0;">
        <tr>
          <td style="padding: 20px;">
            <h3 style="color: ${accentColor}; margin: 0 0 10px 0; font-size: 18px; font-weight: 600; font-family: Arial, sans-serif;">${emoji} ${data.event_name || 'Event'}</h3>
            <p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: ${accentColor};">Invitation Status:</strong> 
              <span style="color: ${headerColor}; font-weight: bold;">${data.status_change || 'Updated'}</span>
            </p>
            <p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: ${accentColor};">Collaborator:</strong> ${data.updated_by || 'Unknown'}</p>
            ${data.status_description ? `<p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: ${accentColor};">Details:</strong> ${data.status_description}</p>` : ''}
          </td>
        </tr>
      </table>
    `;
    return createUniversalEmail({
      title: `${emoji} ${data.status_change || 'Invitation Response'}`,
      subtitle: isAccepted ? 'Great news! Someone accepted your invitation.' : isDeclined ? 'Invitation Response Update' : 'Collaboration Invitation Update',
      content: `
        <h2 style="color: #1f2937; margin-top: 0; font-size: 20px; font-weight: 600; font-family: Arial, sans-serif;">
          ${isAccepted ? 'Great news! Someone accepted your invitation.' : isDeclined ? 'Invitation Response Update' : 'Collaboration Invitation Update'}
        </h2>
        ${contentBox}
        <p style="color: #4b5563; font-size: 15px; margin-top: 30px; font-family: Arial, sans-serif;">
          ${isAccepted ? `The collaborator has accepted your invitation and can now help with planning "${data.event_name || 'this event'}".` : isDeclined ? `The collaborator has declined your invitation for "${data.event_name || 'this event'}".` : data.status_description || 'This is an automated notification regarding the collaboration invitation for your event.'}
        </p>
      `,
      preheader: `Invitation ${data.status_change || 'response'} for ${data.event_name || 'event'}`,
      buttons: [
        {
          text: isAccepted ? 'View Event & Collaborate' : isDeclined ? 'View Event Details' : 'View Event Details',
          url: data.accept_url || '#',
          color: buttonColor
        }
      ],
      headerColor: headerColor,
      buttonColor: buttonColor
    });
  },
  vendor: (data)=>{
    const contentBox = `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0fdf4; border-left: 4px solid #059669; margin: 20px 0;">
        <tr>
          <td style="padding: 20px;">
            <h3 style="color: #047857; margin: 0 0 10px 0; font-size: 18px; font-weight: 600; font-family: Arial, sans-serif;">🎉 ${data.event_name}</h3>
            <p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;"><strong style="color: #047857;">Vendor:</strong> ${data.vendor_name}</p>
            <p style="color: #1f2937; margin: 10px 0; font-size: 15px; font-family: Arial, sans-serif;">You've been invited to participate in this event as a vendor.</p>
          </td>
        </tr>
      </table>
    `;
    return createUniversalEmail({
      title: "🎉 Event Invitation",
      subtitle: "You're invited to participate!",
      content: `
        <h2 style="color: #1f2937; margin-top: 0; font-size: 20px; font-weight: 600; font-family: Arial, sans-serif;">You're invited to participate!</h2>
        ${contentBox}
        <p style="color: #4b5563; font-size: 15px; margin-top: 30px; font-family: Arial, sans-serif;">Click "Accept Invitation" to join this event and start collaborating with the event team.</p>
      `,
      preheader: `Event invitation for ${data.event_name}`,
      buttons: [
        {
          text: "Accept Invitation",
          url: data.accept_url,
          color: "#059669"
        },
        {
          text: "Decline",
          url: data.decline_url,
          color: "#dc2626"
        }
      ],
      headerColor: "#059669",
      buttonColor: "#059669"
    });
  }
};
serve(async (req)=>{
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const requestBody = await req.json();
    const { email, notification_type, event_id, event_name, // Common fields
    inviter_name, assigner_name, sender_name, updated_by, // Task specific
    task_title, task_description, due_date, priority, task_assignment_token, assignment_token, // Invitation specific
    invitation_token, invitation_url, permission_level, // Chat specific
    message_preview, // Event update specific
    update_description, // Status specific
    status_change, status_description, // Vendor specific
    vendor_name, accept_url, decline_url } = requestBody;
    // Validate required fields
    if (!email || !notification_type) {
      throw new Error('Missing required fields: email, notification_type');
    }
    // Get handler for notification type
    const handler = notificationHandlers[notification_type];
    if (!handler) {
      throw new Error(`Unsupported notification type: ${notification_type}`);
    }
    // Generate URLs based on notification type - CORRECTED ROUTES WITH PROPER TABS
    // Using the current production Vercel URL
    const baseUrl = 'https://revayahost.com';
    let acceptUrl = '';
    if (notification_type === 'task_assigned') {
      const token = task_assignment_token || assignment_token;
      // Route to task response page where user can accept/decline
      acceptUrl = `${baseUrl}/#/task-response?token=${token}`;
    } else if (notification_type === 'task_updated') {
      // Route to event detail page, tasks tab to see the updated task
      acceptUrl = `${baseUrl}/#/event/view/${event_id}?tab=tasks`;
    } else if (notification_type === 'task_completed') {
      // Route to event detail page, tasks tab to see completed task
      acceptUrl = `${baseUrl}/#/event/view/${event_id}?tab=tasks`;
    } else if (notification_type === 'collaborator_invitation') {
      // Route to collaborator invitation response page
      acceptUrl = invitation_url || `${baseUrl}/#/collaborator-invite-response?token=${invitation_token}`;
    } else if (notification_type === 'chat_message') {
      // Route to event detail page, chat/messages tab
      acceptUrl = `${baseUrl}/#/event/view/${event_id}?tab=chat`;
    } else if (notification_type === 'event_updated') {
      // Route to event detail page (defaults to overview tab)
      acceptUrl = `${baseUrl}/#/event/view/${event_id}`;
    } else if (notification_type === 'collaborator_status_changed') {
      // Route to event detail page, collaborators tab to see status
      acceptUrl = `${baseUrl}/#/event/view/${event_id}?tab=collaborators`;
    } else if (notification_type === 'vendor_invitation') {
      // Use provided URL or default to event detail
      acceptUrl = accept_url || `${baseUrl}/#/event/view/${event_id}`;
    }
    // Get or generate unsubscribe token for recipient
    // First try to find user by email in profiles table
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://drhzvzimmmdbsvwhlsxm.supabase.co'
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    let unsubscribeLink = ''
    
    if (supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        
        // Try to find profile by email
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, unsubscribe_token, unsubscribed_at')
          .eq('email', email)
          .maybeSingle()
        
        // Check if user is unsubscribed (only skip marketing emails, not transactional)
        // For notification emails, we still send them but don't include unsubscribe link if unsubscribed
        if (profile) {
          if (!profile.unsubscribed_at) {
            // Generate token if it doesn't exist
            let unsubscribeToken = profile.unsubscribe_token
            if (!unsubscribeToken) {
              unsubscribeToken = crypto.randomUUID()
              await supabase
                .from('profiles')
                .update({ unsubscribe_token: unsubscribeToken })
                .eq('id', profile.id)
            }
            unsubscribeLink = `https://mrjnkoijfrbsapykgfwj.supabase.co/functions/v1/unsubscribe?token=${unsubscribeToken}`
          }
        } else {
          // If no profile found, try contacts table (if it exists)
          // For now, we'll skip unsubscribe link for non-users
          // In future, could add contacts table support
        }
      } catch (error) {
        console.error('⚠️ Error getting unsubscribe token:', error)
        // Continue without unsubscribe link - not critical
      }
    }
    
    // Generate subject and HTML content
    const subject = handler.subject(requestBody);
    const template = emailTemplates[handler.template];
    // Debug: Log the data being passed to the template
    const templateData = {
      ...requestBody,
      accept_url: acceptUrl,
      decline_url: decline_url || acceptUrl // Use acceptUrl as fallback for decline
    };
    
    // Get base HTML from template
    let htmlContent = template(templateData);
    
    // If template uses createUniversalEmail, we need to inject unsubscribe link
    // Since templates already call createUniversalEmail, we need to modify the approach
    // For now, we'll append unsubscribe footer to all notification emails
    if (unsubscribeLink) {
      // Extract footer section and add unsubscribe link
      // This is a simple approach - in production you might want to refactor templates
      htmlContent = htmlContent.replace(
        '</body>',
        `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <tr>
                <td align="center" style="padding: 20px; background-color: #f9fafb;">
                    <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center; font-family: Arial, sans-serif;">
                        <a href="${unsubscribeLink}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a>
                        &nbsp;•&nbsp;
                        <a href="https://www.revayahost.com/#/preferences" style="color:#64748B;text-decoration:underline;">Manage preferences</a>
                        <br><br>
                        Revaya Hospitality Group LLC • 407 Lincoln Road, Ste 6H, Miami Beach, FL 33139 • 
                        <a href="mailto:info@revayahg.com" style="color:#64748B;text-decoration:underline;">info@revayahg.com</a>
                    </p>
                </td>
            </tr>
        </table>
        </body>`
      )
    }
    console.log('📨 Sending email:', {
      to: email,
      type: notification_type,
      subject,
      hasTemplate: !!template
    });
    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Revaya Host <info@revayahg.com>',
        to: [
          email
        ],
        subject: subject,
        html: htmlContent
      })
    });
    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('❌ Resend API error:', errorText);
      throw new Error(`Failed to send email: ${emailResponse.status} - ${errorText}`);
    }
    const result = await emailResponse.json();
    console.log('✅ Email sent successfully:', result.id);
    return new Response(JSON.stringify({
      success: true,
      id: result.id,
      notification_type,
      email_sent_to: email
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
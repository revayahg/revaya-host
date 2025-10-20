// InvitationEmailService - Handles sending vendor invitations via email - Updated 2025-01-04
window.InvitationEmailService = {
  async sendInvitation({ requestingUserId, receivingUserId, vendorName, vendorEmail, eventId, invitationLink, vendorProfileId }) {
    try {
      console.log('Sending invitation:', {
        requestingUserId,
        receivingUserId,
        vendorName,
        vendorEmail,
        eventId,
        invitationLink,
        vendorProfileId
      });

      // Validate invitation link format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!invitationLink || !uuidRegex.test(invitationLink)) {
        throw new Error('Invalid invitation link format');
      }

      // Generate invitation URLs with production domain
      const baseUrl = 'https://revayahost.com';
      const acceptUrl = `${baseUrl}/#/invite-response?invitation=${invitationLink}&action=accept&event=${eventId}&vendor=${vendorProfileId}`;
      const declineUrl = `${baseUrl}/#/invite-response?invitation=${invitationLink}&action=decline&event=${eventId}&vendor=${vendorProfileId}`;

      // Get event name for the invitation
      const { data: eventData, error: eventError } = await window.supabaseClient
        .from('events')
        .select('name')
        .eq('id', eventId)
        .single();

      if (eventError) {
        throw eventError;
      }

      // Use the upsert function to handle invitation creation properly
      
      const { data: invitationId, error: invErr } = await window.supabaseClient
        .rpc('upsert_event_invitation', {
          p_event_id: eventId,
          p_vendor_profile_id: vendorProfileId,
          p_receiving_user_id: receivingUserId,
          p_requesting_user_id: requestingUserId,
          p_vendor_name: vendorName,
          p_vendor_email: vendorEmail,
          p_event_name: eventData.name
        });

      if (invErr) {
        console.error('Invitation creation error:', {
          message: invErr.message,
          details: invErr.details,
          hint: invErr.hint,
          code: invErr.code
        });
        throw new Error(`Invitation creation failed: ${invErr.message}`);
      }

      // Get the full invitation record
      const { data: newRecord, error: fetchError } = await window.supabaseClient
        .from('event_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (fetchError) {
        throw fetchError;
      }
      

      // Dispatch real-time event for immediate UI updates
      window.dispatchEvent(new CustomEvent('vendorInvited', {
        detail: {
          eventId: eventId,
          vendorProfileId: vendorProfileId,
          invitationId: newRecord.id,
          vendorName: vendorName,
          vendorEmail: vendorEmail
        }
      }));
      
      window.dispatchEvent(new CustomEvent('vendorDataChanged', {
        detail: {
          eventId: eventId,
          vendorProfileId: vendorProfileId
        }
      }));

      // Send the actual email
      await window.InvitationEmailService.sendInvitationEmail({
        to: vendorEmail,
        vendorName,
        eventId,
        invitationId: newRecord.id,
        acceptUrl,
        declineUrl
      });

      return {
        success: true,
        acceptUrl,
        declineUrl,
        invitationRecord: newRecord
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  async sendInvitationEmail({ to, vendorName, eventId, invitationId, acceptUrl, declineUrl }) {
    try {

      // Get event details for email
      const { data: event, error: eventError } = await window.supabaseClient
        .from('events')
        .select('name, start_date, location, about')
        .eq('id', eventId)
        .single();

      if (eventError) {
        throw eventError;
      }

      // Format event date
      const eventDate = new Date(event.start_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Create universal-compatible email content
      const contentBox = `
        <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <h3 style="color: #2d3748; margin-top: 0; font-size: 18px; font-weight: 600;">Event Details</h3>
          <p style="color: #4a5568; margin: 10px 0; font-size: 16px;"><strong>Event:</strong> ${event.name}</p>
          <p style="color: #4a5568; margin: 10px 0; font-size: 16px;"><strong>Date:</strong> ${eventDate}</p>
          <p style="color: #4a5568; margin: 10px 0; font-size: 16px;"><strong>Location:</strong> ${event.location || 'TBD'}</p>
          ${event.about ? `<p style="color: #4a5568; margin: 10px 0; font-size: 16px;"><strong>About:</strong> ${event.about}</p>` : ''}
        </div>
      `;

      const htmlContent = window.createUniversalEmail ? window.createUniversalEmail({
        title: "🎉 Event Invitation",
        subtitle: "You're invited to participate!",
        content: `
          <p style="color: #4a5568; margin: 0 0 20px 0; font-size: 16px;">Hi ${vendorName},</p>
          <p style="color: #4a5568; margin: 0 0 25px 0; font-size: 16px;">You've been invited to participate in <strong>${event.name}</strong>.</p>
          ${contentBox}
          <p style="color: #718096; font-size: 14px; margin-top: 30px;">
            Click the appropriate button above to respond instantly to this invitation.
          </p>
          <p style="color: #718096; font-size: 14px; margin-top: 20px;">
            Best regards,<br><strong>The Revaya Host Team</strong>
          </p>
        `,
        preheader: `Event invitation for ${event.name}`,
        buttons: [
          {
            text: "✅ Accept Invitation",
            url: acceptUrl,
            color: "#10b981"
          },
          {
            text: "❌ Decline",
            url: declineUrl,
            color: "#ef4444"
          }
        ],
        headerColor: "#667eea",
        buttonColor: "#10b981"
      }) : `
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Event Invitation - ${event.name}</title>
          <!--[if mso]>
          <noscript>
              <xml>
                  <o:OfficeDocumentSettings>
                      <o:PixelsPerInch>96</o:PixelsPerInch>
                  </o:OfficeDocumentSettings>
              </xml>
          </noscript>
          <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, sans-serif;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
            <tr>
              <td align="center" style="padding: 20px 10px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                  <tr>
                    <td align="center" style="padding: 30px 20px 20px; background-color: #667eea;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td align="center" style="background-color: #4c51bf; width: 60px; height: 60px; border-radius: 50%; font-size: 24px; font-weight: bold; color: #ffffff; line-height: 60px;">
                            RH
                          </td>
                        </tr>
                      </table>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 20px;">
                        <tr>
                          <td align="center" style="color: #ffffff; font-size: 28px; font-weight: bold; line-height: 1.2; font-family: Arial, sans-serif;">
                            🎉 Event Invitation
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="color: #e2e8f0; font-size: 16px; line-height: 1.4; font-family: Arial, sans-serif; padding-top: 8px;">
                            You're invited to participate!
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 20px; background-color: #ffffff;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="color: #374151; font-size: 16px; line-height: 1.6; font-family: Arial, sans-serif; text-align: left;">
                            <p style="color: #4a5568; margin: 0 0 20px 0; font-size: 16px;">Hi ${vendorName},</p>
                            <p style="color: #4a5568; margin: 0 0 25px 0; font-size: 16px;">You've been invited to participate in <strong>${event.name}</strong>.</p>
                            ${contentBox}
                            <p style="color: #718096; font-size: 14px; margin-top: 30px;">
                              Click the appropriate button above to respond instantly to this invitation.
                            </p>
                            <p style="color: #718096; font-size: 14px; margin-top: 20px;">
                              Best regards,<br><strong>The Revaya Host Team</strong>
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding: 30px 0 20px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                                <td align="center" style="border-radius: 6px; background-color: #10b981; margin: 5px;">
                                  <a href="${acceptUrl}" style="display: inline-block; padding: 14px 28px; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; color: #ffffff; border-radius: 6px; background-color: #10b981;">
                                    ✅ Accept Invitation
                                  </a>
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style="border-radius: 6px; background-color: #ef4444; margin: 5px;">
                                  <a href="${declineUrl}" style="display: inline-block; padding: 14px 28px; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; color: #ffffff; border-radius: 6px; background-color: #ef4444;">
                                    ❌ Decline
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
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

      const textContent = `
        You're Invited to ${event.name}!
        
        Hi ${vendorName},
        
        You've been invited to participate in ${event.name}.
        
        Event Details:
        Date: ${eventDate}
        Location: ${event.location || 'TBD'}
        ${event.about ? `About: ${event.about}` : ''}
        
        To respond to this invitation, click one of the links below:
        
        ✅ Accept: ${acceptUrl}
        ❌ Decline: ${declineUrl}
        
        Best regards,
        The Revaya Host Team
      `;

      // Create email data with proper structure
      const subject = `Event Invitation: ${event.name}`;
      
      const emailData = {
        to,
        subject,
        html: htmlContent,
        text: textContent,
        invitationId
      };

      console.log('Email data prepared:', {
        to, 
        subject, 
        invitationId,
        emailDataKeys: Object.keys(emailData)
      });

      // Use unified notification service for vendor invitations
      if (window.unifiedNotificationService) {
        try {
          const result = await window.unifiedNotificationService.sendVendorInvitationEmail(
            to,
            vendorName,
            eventId,
            event.name,
            acceptUrl,
            declineUrl
          );
          console.log('✅ Vendor invitation sent via unified service');
          return { success: true, data: result };
        } catch (unifiedError) {
          console.error('❌ Unified service failed, falling back to legacy edge function:', unifiedError);
          // Fall back to legacy edge function if unified service fails
        }
      }

      // Fallback: Call the legacy Supabase Edge Function
      const { data, error } = await window.supabaseClient.functions.invoke('send-invitation-email', {
        body: emailData
      });

      console.log('Edge function response:', {
        hasData: !!data, 
        dataKeys: data ? Object.keys(data) : [],
        hasError: !!error,
        errorMessage: error?.message 
      });

      if (error) {
        console.log({
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        });
        
        // More detailed error message
        const errorMsg = error.message || error.details || 'Unknown edge function error';
        throw new Error(`Email service error: ${errorMsg}`);
      }

      // Check if data indicates an error
      if (data && !data.success) {
        throw new Error(`Email sending failed: ${data.error || data.message || 'Unknown error'}`);
      }

      
      // Update invitation record with success
      try {
        await window.supabaseClient
          .from('event_invitations')
          .update({
            email_delivery_status: 'sent',
            email_sent_at: new Date().toISOString()
          })
          .eq('id', invitationId);
      } catch (updateError) {
      }

      // Create notification for invitation if user exists
      try {
        const { data: userData } = await window.supabaseClient
          .from('profiles')
          .select('id')
          .eq('email', to)
          .single();

        if (userData && window.notificationAPI) {
          await window.notificationAPI.createNotification({
            userId: userData.id,
            type: 'invitation',
            title: 'Event Invitation',
            message: `You have been invited to participate in ${event.name}`,
            eventId: eventId,
            relatedId: invitationId
          });
        }
      } catch (notificationError) {
      }

      return { success: true, data };

    } catch (error) {
      
      // Update invitation record with email failure
      if (invitationId) {
        try {
          await window.supabaseClient
            .from('event_invitations')
            .update({
              email_delivery_status: 'failed',
              email_error: error.message || 'Unknown error'
            })
            .eq('id', invitationId);
        } catch (updateError) {
        }
      }
      
      // For development: Show invitation links in console as fallback
      
      // Still throw the error to handle it upstream
      throw error;
    }
  }
};


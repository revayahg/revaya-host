// Generate invitation token helper
function generateInvitationToken() {
  return 'collab_' + Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
}

// Simplified Collaborator API - single source of truth - Updated 2025-01-04
console.log('🔥 collaboratorAPI.js loaded - CACHE BUST TEST - UPDATED 21:22:30');
window.collaboratorAPI = {
  // Test function to verify API is loaded correctly
  testAPI: function() {
    return { success: true, message: 'API is working correctly' };
  },

  // Get active collaborators for an event - PRIMARY SOURCE: event_user_roles table
  getCollaborators: async function(eventId) {
    try {
      
      const session = await window.getSessionWithRetry?.(3, 150);
      if (!session?.user) {
        return [];
      }
      

      // PRIMARY DATA SOURCE: event_user_roles table
      let collaborators = [];
      
      try {
        // Get all active users for this event from event_user_roles
        const { data: rolesData, error: rolesError } = await window.supabaseClient
          .from('event_user_roles')
          .select('user_id, role, status, created_at, updated_at')
          .eq('event_id', eventId)
          .eq('status', 'active');

        if (rolesError) {
          throw rolesError;
        }


        if (rolesData && rolesData.length > 0) {
          // Get user profiles for all role holders
          const userIds = rolesData.map(r => r.user_id);

          const { data: profilesData, error: profilesError } = await window.supabaseClient
            .from('profiles')
            .select('id, email, first_name, last_name')
            .in('id', userIds);

          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
          }

          const profiles = profilesData || [];

          // Build collaborators array - deduplicate by user_id
          const seenUserIds = new Set();
          collaborators = rolesData
            .filter(role => {
              if (seenUserIds.has(role.user_id)) {
                return false; // Skip duplicate
              }
              seenUserIds.add(role.user_id);
              return true;
            })
            .map(role => {
              const profile = profiles.find(p => p.id === role.user_id);
              const displayName = profile 
                ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || `User ${role.user_id.slice(0, 8)}`
                : `User ${role.user_id.slice(0, 8)}`;

              return {
                id: role.user_id,
                user_id: role.user_id,
                role: role.role,
                status: 'active',
                email: profile?.email || '',
                displayName,
                created_at: role.created_at,
                _isOwner: role.role === 'admin'
              };
            });
        }
        
      } catch (error) {
        console.error('Error in getCollaborators:', error);
        return [];
      }

      // SUPPLEMENTARY DATA: Get pending invitations from event_collaborator_invitations
      try {
        const { data: pendingInvitations, error: invitationsError } = await window.supabaseClient
          .from('event_collaborator_invitations')
          .select('id, email, role, status, created_at, invited_by_name')
          .eq('event_id', eventId)
          .eq('status', 'pending');

        if (invitationsError) {
        } else {
          
          // Add pending invitations to collaborators list (but filter out duplicates)
          if (pendingInvitations && pendingInvitations.length > 0) {
            // Get list of existing collaborator emails to avoid duplicates
            const existingEmails = new Set(
              collaborators
                .map(c => c.email)
                .filter(email => email) // Only include non-null emails
            );
            
            // Filter out invitations for users who are already active collaborators
            const uniquePendingInvitations = pendingInvitations.filter(invitation => 
              !existingEmails.has(invitation.email)
            );
            
            
            const pendingCollaborators = uniquePendingInvitations.map(invitation => ({
              id: `pending_${invitation.id}`,
              user_id: null,
              role: invitation.role,
              status: 'pending',
              email: invitation.email,
              displayName: invitation.email,
              created_at: invitation.created_at,
              _isPending: true,
              _invitationId: invitation.id,
              _invitedByName: invitation.invited_by_name
            }));
            
            collaborators.push(...pendingCollaborators);
          }
        }
      } catch (error) {
      }

      // Dispatch UI update event
      if (typeof window !== 'undefined' && window.eventBus?.emit) {
        window.eventBus.emit('collaboratorUpdated');
      }
      
      return collaborators;
        
    } catch (error) {
      const errorMessage = error && error.message ? error.message : 'Unknown error occurred';
      return [];
    }
  },

  // Send collaborator invitation
  sendCollaboratorInvitation: async function(eventId, email, role = 'viewer') {
    try {

      const session = await window.getSessionWithRetry?.(3, 150);
      if (!session?.user) {
        throw new Error('Authentication required');
      }


      // Ensure event owner has admin role first
      await this.ensureEventOwnerRole(eventId);

      // Check if invitation already exists
      const { data: existingInvitation } = await window.supabaseClient
        .from('event_collaborator_invitations')
        .select('*')
        .eq('event_id', eventId)
        .eq('email', email)
        .single();

      if (existingInvitation) {
        if (existingInvitation.status === 'accepted') {
          throw new Error('This user has already accepted an invitation to collaborate on this event');
        } else if (existingInvitation.status === 'pending') {
          // Resend existing invitation
          const { data: eventData } = await window.supabaseClient
            .from('events')
            .select('name, title')
            .eq('id', eventId)
            .single();

          const { data: profile } = await window.supabaseClient
            .from('profiles')
            .select('full_name, email')
            .eq('id', session.user.id)
            .single();

          const inviterName = profile?.full_name || profile?.email || session.user.email;
          const eventName = eventData?.name || eventData?.title || 'Event';

          // Create in-app notification for resend (if user has an account)
          try {
            const { data: invitedUser } = await window.supabaseClient
              .from('profiles')
              .select('id, full_name, email')
              .eq('email', email)
              .single();

            if (invitedUser) {
              const notificationPayload = {
                user_id: invitedUser.id,
                type: 'collaborator_invitation',
                title: `🤝 Collaboration Invitation (Resent)`,
                message: `${inviterName} resent your collaboration invitation for "${eventName}"`,
                event_id: eventId,
                read_status: false,
                metadata: {
                  invitation_token: existingInvitation.invitation_token,
                  inviter_name: inviterName,
                  inviter_id: session.user.id,
                  event_name: eventName,
                  role: existingInvitation.role,
                  invitation_id: existingInvitation.id,
                  resent: true
                }
              };

              const { data: notification, error: notifError } = await window.supabaseClient
                .from('notifications')
                .insert([notificationPayload])
                .select()
                .single();

              if (notifError) {
                console.error('❌ Failed to create resend notification:', notifError);
              } else {
                console.log('✅ Collaborator invitation resend notification created:', notification.id);
              }
            }
          } catch (notificationError) {
            console.error('❌ Error creating resend notification:', notificationError);
          }

          // Create notification in notifications table for the invited user (if they have an account)
          try {
            // First, try to find the user by email
            const { data: invitedUser, error: userLookupError } = await window.supabaseClient
              .from('profiles')
              .select('id, full_name, email')
              .eq('email', email)
              .single();

            if (invitedUser) {
              // User exists, create notification in notifications table
              const notificationPayload = {
                user_id: invitedUser.id,
                type: 'collaborator_invitation',
                title: '🤝 Collaboration Invitation',
                message: `${inviterName} invited you to collaborate on "${eventName}"`,
                event_id: eventId,
                read_status: false,
                metadata: {
                  invitation_token: existingInvitation.invitation_token,
                  inviter_name: inviterName,
                  inviter_id: session.user.id,
                  event_name: eventName,
                  role: existingInvitation.role,
                  invitation_id: existingInvitation.id,
                  permission_level: existingInvitation.role
                }
              };

              const { data: notification, error: notifError } = await window.supabaseClient
                .from('notifications')
                .insert([notificationPayload])
                .select()
                .single();

              if (notifError) {
                console.error('❌ Failed to create collaborator invitation notification:', notifError);
              } else {
                console.log('✅ Collaborator invitation notification created:', notification.id);
                console.log('🔍 Notification payload was:', notificationPayload);
              }
            } else {
              console.log('ℹ️ User not found for email, skipping in-app notification (email will still be sent)');
            }
          } catch (notificationError) {
            console.error('❌ Error creating collaborator invitation notification:', notificationError);
            // Don't fail invitation creation if notification fails
          }

          // Resend existing invitation using send-notification-email edge function
          try {
            const emailPayload = {
              email: email,
              notification_type: 'collaborator_invitation',
              event_id: eventId,
              event_name: eventName,
              inviter_name: inviterName,
              invitation_token: existingInvitation.invitation_token,
              permission_level: existingInvitation.role,
              invitation_url: `https://revayahost.com/#/collaborator-invite-response?token=${existingInvitation.invitation_token}`
            };

            const response = await fetch(`${window.supabaseClient.supabaseUrl}/functions/v1/send-notification-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.supabaseClient.supabaseKey}`
              },
              body: JSON.stringify(emailPayload)
            });

            if (!response.ok) {
              throw new Error(`Email service responded with ${response.status}`);
            }

            console.log('✅ Collaborator invitation resent via send-notification-email');
            return { success: true, resent: true };
          } catch (emailError) {
            console.error('❌ Collaborator invitation resend failed (non-blocking):', emailError);
            throw new Error('Failed to resend invitation email');
          }
        } else {
          // For declined/expired/removed invitations, delete the old one and create a new one
          await window.supabaseClient
            .from('event_collaborator_invitations')
            .delete()
            .eq('event_id', eventId)
            .eq('email', email);
        }
      }

      const invitationToken = generateInvitationToken();
      
      const invitationData = {
        event_id: eventId,
        email,
        role,
        status: 'pending',
        invitation_token: invitationToken,
        invited_by: session.user.id,
        invited_by_name: session.user.email
      };


      const { data, error } = await window.supabaseClient
        .from('event_collaborator_invitations')
        .insert(invitationData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Get event details
      const { data: eventData } = await window.supabaseClient
        .from('events')
        .select('name, title')
        .eq('id', eventId)
        .single();

      // Get current user profile
      const { data: profile } = await window.supabaseClient
        .from('profiles')
        .select('full_name, email')
        .eq('id', session.user.id)
        .single();

      const inviterName = profile?.full_name || profile?.email || session.user.email;
      const eventName = eventData?.name || eventData?.title || 'Event';

      // Create in-app notification for the invited user (if they have an account)
      try {
        // First, try to find the user by email
        const { data: invitedUser, error: userLookupError } = await window.supabaseClient
          .from('profiles')
          .select('id, full_name, email')
          .eq('email', email)
          .single();

        if (invitedUser) {
          // User exists, create in-app notification
          const notificationPayload = {
            user_id: invitedUser.id,
            type: 'collaborator_invitation',
            title: `🤝 Collaboration Invitation`,
            message: `${inviterName} invited you to collaborate on "${eventName}"`,
            event_id: eventId,
            read_status: false,
            metadata: {
              invitation_token: invitationToken,
              inviter_name: inviterName,
              inviter_id: session.user.id,
              event_name: eventName,
              role: role,
              invitation_id: data.id
            }
          };

          const { data: notification, error: notifError } = await window.supabaseClient
            .from('notifications')
            .insert([notificationPayload])
            .select()
            .single();

          if (notifError) {
            console.error('❌ Failed to create collaborator invitation notification:', notifError);
          } else {
            console.log('✅ Collaborator invitation notification created:', notification.id);
          }
        } else {
          console.log('ℹ️ User not found for email, skipping in-app notification (email will still be sent)');
        }
      } catch (notificationError) {
        console.error('❌ Error creating collaborator invitation notification:', notificationError);
        // Don't fail invitation creation if notification fails
      }


      // Create notification in notifications table for the invited user (if they have an account)
      try {
        // First, try to find the user by email
        const { data: invitedUser, error: userLookupError } = await window.supabaseClient
          .from('profiles')
          .select('id, full_name, email')
          .eq('email', email)
          .single();

        if (invitedUser) {
          // User exists, create notification in notifications table
          const notificationPayload = {
            user_id: invitedUser.id,
            type: 'collaborator_invitation',
            title: '🤝 Collaboration Invitation',
            message: `${inviterName} invited you to collaborate on "${eventName}"`,
            event_id: eventId,
            read_status: false,
            metadata: {
              invitation_token: invitationToken,
              inviter_name: inviterName,
              inviter_id: session.user.id,
              event_name: eventName,
              role: role,
              invitation_id: data.id,
              permission_level: role
            }
          };

          const { data: notification, error: notifError } = await window.supabaseClient
            .from('notifications')
            .insert([notificationPayload])
            .select()
            .single();

          if (notifError) {
            console.error('❌ Failed to create collaborator invitation notification:', notifError);
          } else {
            console.log('✅ Collaborator invitation notification created:', notification.id);
          }
        } else {
          console.log('ℹ️ User not found for email, skipping in-app notification (email will still be sent)');
        }
      } catch (notificationError) {
        console.error('❌ Error creating collaborator invitation notification:', notificationError);
        // Don't fail invitation creation if notification fails
      }

      // Send email invitation using send-notification-email edge function
      try {
        const emailPayload = {
          email: email,
          notification_type: 'collaborator_invitation',
          event_id: eventId,
          event_name: eventName,
          inviter_name: inviterName,
          invitation_token: invitationToken,
          permission_level: role,
          invitation_url: `https://revayahost.com/#/collaborator-invite-response?token=${invitationToken}`
        };

        const response = await fetch(`${window.supabaseClient.supabaseUrl}/functions/v1/send-notification-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${window.supabaseClient.supabaseKey}`
          },
          body: JSON.stringify(emailPayload)
        });

        if (!response.ok) {
          throw new Error(`Email service responded with ${response.status}`);
        }

        console.log('✅ Collaborator invitation email sent via send-notification-email');
      } catch (emailError) {
        console.error('❌ Collaborator invitation email failed (non-blocking):', emailError);
        // Don't fail invitation creation if email fails
      }

      // Dispatch update event
      if (window.eventBus?.emit) {
        window.eventBus.emit('collaboratorUpdated');
        window.eventBus.emit('eventsUpdated');
      }

      // Dispatch collaborator invitation event for notifications
      window.dispatchEvent(new CustomEvent('collaboratorInvited', {
        detail: {
          eventId: eventId,
          email: email,
          inviterName: inviterName,
          eventName: eventName,
          role: role
        }
      }));

      // Verify invitation was created by querying it back
      const { data: verifyData, error: verifyError } = await window.supabaseClient
        .from('event_collaborator_invitations')
        .select('*')
        .eq('invitation_token', invitationToken)
        .single();

      if (verifyError) {
      } else {
      }

      return data;
    } catch (error) {
      throw error;
    }
  },

  // Get pending invitations
  getCollaboratorInvitations: async function(eventId) {
    try {
      const { data, error } = await window.supabaseClient
        .from('event_collaborator_invitations')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'pending');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      return [];
    }
  },

  // Accept invitation by token - CRITICAL: Creates event_user_roles entry as source of truth
  acceptInvitationByToken: async function(token) {
    try {
      
      const session = await window.getSessionWithRetry?.(3, 150);
      if (!session?.user) {
        throw new Error('Authentication required');
      }


      // Get the invitation details
      const { data: invitation, error: inviteError } = await window.supabaseClient
        .from('event_collaborator_invitations')
        .select('*')
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .single();


      if (inviteError || !invitation) {
        throw new Error('Invalid or expired invitation');
      }


      // CRITICAL STEP: Add user to event_user_roles table (PRIMARY SOURCE OF TRUTH)
      console.log('🔍 Checking for existing role for user:', session.user.id, 'event:', invitation.event_id);
      
      // First check if role already exists
      const { data: existingRole, error: checkError } = await window.supabaseClient
        .from('event_user_roles')
        .select('*')
        .eq('event_id', invitation.event_id)
        .eq('user_id', session.user.id)
        .maybeSingle();

      console.log('🔍 Existing role check result:', { existingRole, checkError });

      if (checkError) {
        throw new Error('Failed to check existing role: ' + checkError.message);
      }

      let roleData;
      if (existingRole) {
        console.log('🔄 Updating existing role:', existingRole.id);
        // Update existing role
        const { data: updatedRole, error: updateError } = await window.supabaseClient
          .from('event_user_roles')
          .update({
            role: invitation.role,
            status: 'active'
          })
          .eq('event_id', invitation.event_id)
          .eq('user_id', session.user.id)
          .select();

        console.log('🔄 Role update result:', { updatedRole, updateError });

        if (updateError) {
          throw new Error('Failed to update collaborator role: ' + updateError.message);
        }
        roleData = updatedRole;
      } else {
        console.log('➕ Creating new role for user:', session.user.id, 'event:', invitation.event_id, 'role:', invitation.role);
        // Insert new role
        const { data: newRole, error: insertError } = await window.supabaseClient
          .from('event_user_roles')
          .insert({
            event_id: invitation.event_id,
            user_id: session.user.id,
            role: invitation.role,
            status: 'active'
          })
          .select();

        console.log('➕ Role creation result:', { newRole, insertError });

        if (insertError) {
          throw new Error('Failed to add collaborator role: ' + insertError.message);
        }
        roleData = newRole;
      }


      // Update invitation status (secondary operation)
      const { error: updateError } = await window.supabaseClient
        .from('event_collaborator_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: session.user.id
        })
        .eq('id', invitation.id);

      if (updateError) {
      } else {
      }

      // Verify the role was actually created
      const { data: verifyRole, error: verifyError } = await window.supabaseClient
        .from('event_user_roles')
        .select('*')
        .eq('event_id', invitation.event_id)
        .eq('user_id', session.user.id);


      // Send status change notification to event owner
      try {
        console.log('📧 Attempting to send collaborator acceptance notification...');
        
        // Get event owner email - use separate queries to avoid join issues
        let eventOwner = null;
        let ownerError = null;
        
        // First try: Look for owner role
        try {
          const { data: ownerData, error: ownerError } = await window.supabaseClient
            .from('event_user_roles')
            .select('user_id')
            .eq('event_id', invitation.event_id)
            .eq('role', 'owner')
            .maybeSingle();
            
          if (ownerData && ownerData.user_id) {
            // Get profile separately
            const { data: profileData, error: profileError } = await window.supabaseClient
              .from('profiles')
              .select('email, first_name, last_name')
              .eq('id', ownerData.user_id)
              .single();
              
            if (profileData && profileData.email) {
              eventOwner = {
                user_id: ownerData.user_id,
                profiles: profileData
              };
              console.log('✅ Found event owner via owner role:', profileData.email);
            }
          }
        } catch (error) {
          console.log('⚠️ Owner role lookup failed:', error);
        }
        
        // Fallback: Look for event creator from events table
        if (!eventOwner) {
          try {
            const { data: eventData, error: eventError } = await window.supabaseClient
              .from('events')
              .select('created_by')
              .eq('id', invitation.event_id)
              .single();
              
            if (eventData && eventData.created_by) {
              // Get profile separately
              const { data: profileData, error: profileError } = await window.supabaseClient
                .from('profiles')
                .select('email, first_name, last_name')
                .eq('id', eventData.created_by)
                .single();
                
              if (profileData && profileData.email) {
                eventOwner = {
                  user_id: eventData.created_by,
                  profiles: profileData
                };
                console.log('✅ Found event owner via events table:', profileData.email);
              }
            }
          } catch (error) {
            console.log('⚠️ Events table lookup failed:', error);
            ownerError = error;
          }
        }

        console.log('🔍 Event owner lookup result:', { eventOwner, ownerError });

        if (eventOwner?.profiles?.email) {
          console.log('📤 Sending email to event owner:', eventOwner.profiles.email);
          
          // Get event name from the events table if not in invitation
          let eventName = invitation.event_name;
          if (!eventName) {
            try {
              const { data: eventData } = await window.supabaseClient
                .from('events')
                .select('name, title')
                .eq('id', invitation.event_id)
                .single();
              eventName = eventData?.name || eventData?.title || 'Event';
            } catch (error) {
              console.log('⚠️ Could not fetch event name:', error);
              eventName = 'Event';
            }
          }

          const emailResult = await window.unifiedNotificationService.sendCollaboratorStatusChangeEmail(
            eventOwner.profiles.email,
            eventName,
            invitation.event_id,
            'Invitation Accepted',
            session.user.email || 'Collaborator',
            `Great news! ${session.user.email || 'A collaborator'} has accepted your invitation to collaborate on "${eventName}". They can now help with planning and managing this event.`
          );
          
          console.log('📧 Email send result:', emailResult);
          console.log('✅ Collaborator acceptance notification sent to event owner');
        } else {
          console.log('❌ No event owner found or no email address');
        }
      } catch (notificationError) {
        console.error('❌ Collaborator acceptance notification failed (non-blocking):', notificationError);
      }

      // Dispatch comprehensive update events
      if (window.eventBus?.emit) {
        window.eventBus.emit('collaboratorUpdated');
        window.eventBus.emit('eventsUpdated');
        window.eventBus.emit('dashboardRefresh');
      }

      // Dispatch window events as well for broader compatibility
      window.dispatchEvent(new CustomEvent('collaboratorUpdated', {
        detail: { eventId: invitation.event_id, userId: session.user.id }
      }));
      window.dispatchEvent(new CustomEvent('eventsUpdated'));

      return { success: true, invitation, role: roleData?.[0] };
    } catch (error) {
      throw error;
    }
  },

  // Update collaborator role - UPDATES event_user_roles role
  updateRole: async function(eventId, userId, newRole) {
    try {
      
      // Validate role
      const validRoles = ['viewer', 'editor', 'admin', 'owner'];
      if (!validRoles.includes(newRole)) {
        throw new Error(`Invalid role: ${newRole}. Must be one of: ${validRoles.join(', ')}`);
      }

      // Update role in event_user_roles (primary source)
      const { error } = await window.supabaseClient
        .from('event_user_roles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to update role: ${error.message || JSON.stringify(error)}`);
      }


      // Dispatch update events for UI components
      if (window.eventBus?.emit) {
        window.eventBus.emit('collaboratorUpdated');
        window.eventBus.emit('eventsUpdated');
      }

      // Trigger role cache refresh for the hot-patch system
      window.dispatchEvent(new CustomEvent('event:role-updated', { 
        detail: { eventId, userId, role: newRole } 
      }));

      return true;
    } catch (error) {
      throw new Error(`Update role failed: ${error.message || 'Unknown error'}`);
    }
  },

  // Remove collaborator - UPDATES event_user_roles status
  removeCollaborator: async function(eventId, userId) {
    try {
      
      // Set status to 'removed' in event_user_roles (primary source)
      const { error } = await window.supabaseClient
        .from('event_user_roles')
        .update({ 
          status: 'removed',
          updated_at: new Date().toISOString()
        })
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to remove collaborator: ${error.message || JSON.stringify(error)}`);
      }


      // Dispatch update event
      if (window.eventBus?.emit) {
        window.eventBus.emit('collaboratorUpdated');
        window.eventBus.emit('eventsUpdated');
      }

      return true;
    } catch (error) {
      throw new Error(`Remove collaborator failed: ${error.message || 'Unknown error'}`);
    }
  },

  // Cancel pending invitation - REMOVES from event_collaborator_invitations
  cancelInvitation: async function(eventId, invitationIdOrToken) {
    try {
      
      if (!invitationIdOrToken) {
        throw new Error('Invitation ID or token is required');
      }

      // First, let's see what invitations exist for this event
      const { data: existingInvitations, error: fetchError } = await window.supabaseClient
        .from('event_collaborator_invitations')
        .select('*')
        .eq('event_id', eventId);

      if (fetchError) {
      } else {
        
        if (existingInvitations && existingInvitations.length > 0) {
          existingInvitations.forEach((inv, index) => {
            console.log(`Invitation ${index + 1}:`, {
              id: inv.id,
              token: inv.invitation_token,
              email: inv.email,
              status: inv.status,
              created_at: inv.created_at
            });
          });
        }
      }

      // Try to find and delete the invitation
      let deleteQuery = window.supabaseClient
        .from('event_collaborator_invitations')
        .delete()
        .eq('event_id', eventId);

      // Check if it's a UUID (ID) or token format
      if (invitationIdOrToken.includes('collab_') || invitationIdOrToken.length > 36) {
        deleteQuery = deleteQuery.eq('invitation_token', invitationIdOrToken);
      } else {
        deleteQuery = deleteQuery.eq('id', invitationIdOrToken);
      }

      const { data: deletedData, error } = await deleteQuery.select();

      if (error) {
        throw new Error(`Failed to cancel invitation: ${error.message || JSON.stringify(error)}`);
      }


      if (!deletedData || deletedData.length === 0) {
        // For expired/processed invitations, don't throw error, just return warning
        return { 
          success: true, 
          warning: 'Invitation not found - it may have already been processed or expired'
        };
      }


      // Dispatch update event
      if (window.eventBus?.emit) {
        window.eventBus.emit('collaboratorUpdated');
        window.eventBus.emit('eventsUpdated');
      }

      return { success: true };
    } catch (error) {
      throw new Error(`Cancel invitation failed: ${error.message || 'Unknown error'}`);
    }
  },

  // Decline invitation by token (for user declining their own invitation)
  declineInvitationByToken: async function(token) {
    try {
      
      const session = await window.getSessionWithRetry?.(3, 150);
      if (!session?.user) {
        throw new Error('Authentication required');
      }

      console.log('🔍 declineInvitationByToken: Looking for token:', token, 'email:', session.user.email);

      // First, let's see what invitations exist for this user
      const { data: allUserInvitations, error: allInvitationsError } = await window.supabaseClient
        .from('event_collaborator_invitations')
        .select('*')
        .eq('email', session.user.email);

      console.log('🔍 declineInvitationByToken: All invitations for user:', allUserInvitations?.length || 0, allUserInvitations);

      // Now try to find the specific invitation (without status filter first)
      const { data: invitationData, error: fetchError } = await window.supabaseClient
        .from('event_collaborator_invitations')
        .select('*')
        .eq('invitation_token', token)
        .eq('email', session.user.email)
        .single();

      console.log('🔍 declineInvitationByToken: Specific invitation search result:', { invitationData, fetchError });
      console.log('🔍 declineInvitationByToken: Invitation details:', invitationData ? {
        id: invitationData.id,
        token: invitationData.invitation_token,
        status: invitationData.status,
        email: invitationData.email,
        event_id: invitationData.event_id
      } : 'No invitation data');

      console.log('🔍 declineInvitationByToken: Checking conditions - fetchError:', fetchError, 'invitationData:', !!invitationData);
      console.log('🔍 declineInvitationByToken: fetchError type:', typeof fetchError, 'value:', fetchError);
      console.log('🔍 declineInvitationByToken: invitationData type:', typeof invitationData, 'value:', invitationData);
      console.log('🔍 declineInvitationByToken: !invitationData:', !invitationData);

      if (fetchError || !invitationData) {
        console.error('❌ declineInvitationByToken: Invitation not found. Error:', fetchError, 'Data:', invitationData);
        throw new Error('Invitation not found or already processed');
      }

      // Check if the invitation is actually pending
      if (invitationData.status !== 'pending') {
        console.log('⚠️ declineInvitationByToken: Invitation found but status is:', invitationData.status, 'not pending');
        // Instead of throwing an error, just return success since the invitation is already processed
        console.log('✅ declineInvitationByToken: Invitation already processed, considering decline successful');
        return { success: true, message: 'Invitation was already processed' };
      }

      // Update the invitation status to 'declined' instead of deleting
      console.log('🗑️ [NEW VERSION 21:22:30] Attempting to update invitation status to expired for ID:', invitationData.id);
      console.log('🗑️ Invitation data for update:', {
        id: invitationData.id,
        token: invitationData.invitation_token,
        email: invitationData.email,
        status: invitationData.status
      });
      const { data: updateResult, error } = await window.supabaseClient
        .from('event_collaborator_invitations')
        .update({ status: 'expired' })
        .eq('id', invitationData.id)
        .select();
        
      console.log('🗑️ Update result:', updateResult, 'error:', error);

      if (error) {
        throw new Error(`Failed to decline invitation: ${error.message}`);
      }

      // For update operations, we expect data back
      console.log('✅ declineInvitationByToken: Invitation successfully expired');
      
      // Verify the invitation status was updated
      const { data: verifyResult } = await window.supabaseClient
        .from('event_collaborator_invitations')
        .select('id, invitation_token, status')
        .eq('id', invitationData.id);
        
      console.log('🔍 Verification query result:', verifyResult);
      
      // Small delay to ensure database deletion is committed
      await new Promise(resolve => setTimeout(resolve, 500));

      // Send status change notification to event owner (optional)
      try {
        const declinedInvitation = invitationData;
        
        // Get event owner email
        const { data: eventOwner, error: ownerError } = await window.supabaseClient
          .from('event_user_roles')
          .select('user_id, profiles(email, first_name, last_name)')
          .eq('event_id', declinedInvitation.event_id)
          .eq('role', 'admin')
          .single();
          
        if (ownerError) {
          console.log('⚠️ Could not get event owner for notification:', ownerError.message);
        }

        if (eventOwner?.profiles?.email) {
          await window.unifiedNotificationService.sendCollaboratorStatusChangeEmail(
            eventOwner.profiles.email,
            declinedInvitation.event_name || 'Event',
            declinedInvitation.event_id,
            'Invitation Declined',
            session.user.email || 'Collaborator',
            `A collaborator has declined the invitation to join the event.`
          );
          console.log('✅ Collaborator decline notification sent to event owner');
        }
      } catch (notificationError) {
        console.error('❌ Collaborator decline notification failed (non-blocking):', notificationError);
      }

      // Mark the notification as read in the notifications table
      try {
        console.log('🔍 Attempting to mark notification as read for user:', session.user.id, 'token:', token);
        
        const { data: notificationData, error: notificationUpdateError } = await window.supabaseClient
          .from('notifications')
          .update({ read_status: true })
          .eq('user_id', session.user.id)
          .eq('type', 'collaborator_invitation')
          .eq('metadata->>invitation_token', token)
          .select();

        if (notificationUpdateError) {
          console.error('❌ Failed to mark notification as read:', notificationUpdateError);
        } else {
          console.log('✅ Marked collaborator invitation notification as read:', notificationData);
        }
      } catch (notificationError) {
        console.error('❌ Error updating notification status:', notificationError);
      }

      // Dispatch update events
      if (window.eventBus?.emit) {
        window.eventBus.emit('collaboratorUpdated');
        window.eventBus.emit('eventsUpdated');
        window.eventBus.emit('dashboardRefresh');
      }

      // Dispatch notification update event
      console.log('📡 declineInvitationByToken: Dispatching notificationRead event');
      window.dispatchEvent(new CustomEvent('notificationRead'));

      return { success: true, invitation: invitationData };
    } catch (error) {
      throw error;
    }
  },

  // Get all collaborators for task assignment
  getAllCollaboratorsForTaskAssignment: async function(eventId) {
    try {
      const collaborators = await window.collaboratorAPI.getCollaborators(eventId);
      
      // Format for task assignment dropdown
      return collaborators.map(collaborator => ({
        id: collaborator.user_id || collaborator.id,
        user_id: collaborator.user_id || collaborator.id,
        name: collaborator.displayName || collaborator.email || `User ${(collaborator.user_id || collaborator.id)?.slice(0, 8)}`,
        displayName: collaborator.displayName || collaborator.email || `User ${(collaborator.user_id || collaborator.id)?.slice(0, 8)}`,
        email: collaborator.email || '',
        role: collaborator.role || 'viewer'
      }));
    } catch (error) {
      return [];
    }
  },

  // Get pending invitations for an event
  getPendingInvitations: async function(eventId) {
    try {
      const { data: invitations, error } = await window.supabaseClient
        .from('event_collaborator_invitations')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'pending');

      if (error) {
        throw error;
      }

      return invitations || [];
    } catch (error) {
      return [];
    }
  },

  // Diagnostic function to check collaborator data integrity
  diagnoseCollaboratorData: async function(eventId) {
    try {
      
      const session = await window.getSessionWithRetry?.(3, 150);
      if (!session?.user) {
        return;
      }


      if (eventId) {
        
        // Check event_collaborator_invitations
        const { data: invitations } = await window.supabaseClient
          .from('event_collaborator_invitations')
          .select('*')
          .eq('event_id', eventId);
        

        // Check event_user_roles
        const { data: roles } = await window.supabaseClient
          .from('event_user_roles')
          .select('*')
          .eq('event_id', eventId);
        

        // Check for current user specifically
        const { data: userRole } = await window.supabaseClient
          .from('event_user_roles')
          .select('*')
          .eq('event_id', eventId)
          .eq('user_id', session.user.id);
        
      } else {
        
        // Get all roles for current user
        const { data: userRoles } = await window.supabaseClient
          .from('event_user_roles')
          .select('*')
          .eq('user_id', session.user.id);
        

        // Get all invitations for current user
        const { data: userInvitations } = await window.supabaseClient
          .from('event_collaborator_invitations')
          .select('*')
          .eq('accepted_by', session.user.id);
        
      }

    } catch (error) {
    }
  },

  // Get collaborative events (events where user has a role but is not owner)
  getCollaborativeEvents: async function() {
    try {
      
      const session = await window.getSessionWithRetry?.(3, 150);
      if (!session?.user) {
        return [];
      }


      // Get all events where user has a non-admin role
      const { data: userRoles, error } = await window.supabaseClient
        .from('event_user_roles')
        .select(`
          event_id,
          role,
          status,
          created_at,
          events!inner(
            id,
            name,
            title, 
            start_date,
            end_date,
            date,
            location,
            status,
            created_at,
            created_by,
            user_id
          )
        `)
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .in('role', ['viewer', 'editor']); // Only non-owner roles

      if (error) {
        return [];
      }


      const events = (userRoles || []).map(roleData => ({
        event: roleData.events,
        role: roleData.role,
        status: roleData.status,
        joined_at: roleData.created_at
      }));

      // Deduplicate events by event ID (in case there are multiple role entries for the same event)
      console.log('🔍 getCollaborativeEvents - Raw events before deduplication:', events.length);
      events.forEach((e, index) => {
        console.log(`  ${index + 1}. Event ID: ${e.event?.id}, Name: "${e.event?.name || e.event?.title}", Role: ${e.role}`);
      });
      
      const uniqueEvents = events.reduce((acc, current) => {
        const existingEvent = acc.find(item => item.event.id === current.event.id);
        if (!existingEvent) {
          acc.push(current);
          console.log(`✅ Added new event: ${current.event.name || current.event.title} (${current.role})`);
        } else {
          // If we find a duplicate, keep the one with the higher role (editor > viewer)
          const rolePriority = { 'editor': 2, 'viewer': 1 };
          if (rolePriority[current.role] > rolePriority[existingEvent.role]) {
            const index = acc.findIndex(item => item.event.id === current.event.id);
            acc[index] = current;
            console.log(`🔄 Replaced duplicate event with higher role: ${current.event.name || current.event.title} (${existingEvent.role} → ${current.role})`);
          } else {
            console.log(`⏭️ Skipped duplicate event (lower role): ${current.event.name || current.event.title} (${current.role} ≤ ${existingEvent.role})`);
          }
        }
        return acc;
      }, []);

      console.log('✅ getCollaborativeEvents - Final unique events:', uniqueEvents.length);
      uniqueEvents.forEach((e, index) => {
        console.log(`  ${index + 1}. Event ID: ${e.event?.id}, Name: "${e.event?.name || e.event?.title}", Role: ${e.role}`);
      });
      return uniqueEvents;
    } catch (error) {
      return [];
    }
  },

  // Ensure event owner has admin role in event_user_roles
  ensureEventOwnerRole: async function(eventId) {
    try {
      const session = await window.getSessionWithRetry?.(3, 150);
      if (!session?.user) {
        return false;
      }


      // Get event details
      const { data: event, error: eventError } = await window.supabaseClient
        .from('events')
        .select('created_by, user_id')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return false;
      }

      const ownerId = event.created_by || event.user_id;

      // Check if owner role exists
      const { data: existingRole } = await window.supabaseClient
        .from('event_user_roles')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', ownerId)
        .single();

      if (!existingRole) {
        const { error: insertError } = await window.supabaseClient
          .from('event_user_roles')
          .insert({
            event_id: eventId,
            user_id: ownerId,
            role: 'admin',
            status: 'active'
          });

        if (insertError) {
          return false;
        }

        return true;
      }

      return true;
    } catch (error) {
      return false;
    }
  },


  // Invite many collaborators at once (bulk invitation)
  inviteMany: async function(eventId, rawInput, role = 'viewer') {
    try {

      const session = await window.getSessionWithRetry?.(3, 150);
      if (!session?.user) {
        throw new Error('Authentication required');
      }

      // Parse emails from raw input
      const emails = window.parseEmails ? window.parseEmails(rawInput) : [];
      if (!emails.length) {
        throw new Error('No valid email addresses found');
      }


      // Ensure event owner has admin role first
      await this.ensureEventOwnerRole(eventId);

      let invited = [];
      let errors = [];
      let resent = false;
      let reminder = false;

      for (const email of emails) {
        try {
          // Check if invitation already exists
          const { data: existingInvitation } = await window.supabaseClient
            .from('event_collaborator_invitations')
            .select('*')
            .eq('event_id', eventId)
            .eq('email', email)
            .single();

          if (existingInvitation) {
            if (existingInvitation.status === 'accepted') {
              continue; // Skip - user already accepted
            } else if (existingInvitation.status === 'pending') {
              // Resend existing invitation
              const { data: eventData } = await window.supabaseClient
                .from('events')
                .select('name, title')
                .eq('id', eventId)
                .single();

              const { data: profileData } = await window.supabaseClient
                .from('profiles')
                .select('full_name, email')
                .eq('id', session.user.id)
                .single();

              const eventName = eventData?.name || eventData?.title || 'Event';
              const inviterName = profileData?.full_name || profileData?.email || session.user.email;

              // Create notification in notifications table for the invited user (if they have an account)
              try {
                // First, try to find the user by email
                const { data: invitedUser, error: userLookupError } = await window.supabaseClient
                  .from('profiles')
                  .select('id, full_name, email')
                  .eq('email', email)
                  .single();

                if (invitedUser) {
                  // User exists, create notification in notifications table
                  const notificationPayload = {
                    user_id: invitedUser.id,
                    type: 'collaborator_invitation',
                    title: '🤝 Collaboration Invitation',
                    message: `${inviterName} invited you to collaborate on "${eventName}"`,
                    event_id: eventId,
                    metadata: {
                      invitation_token: existingInvitation.invitation_token,
                      inviter_name: inviterName,
                      inviter_id: session.user.id,
                      event_name: eventName,
                      role: existingInvitation.role,
                      invitation_id: existingInvitation.id,
                      permission_level: existingInvitation.role
                    }
                  };

                  const { data: notification, error: notifError } = await window.supabaseClient
                    .from('notifications')
                    .insert([notificationPayload])
                    .select()
                    .single();

                  if (notifError) {
                    console.error('❌ Failed to create collaborator invitation notification:', notifError);
                  } else {
                    console.log('✅ Collaborator invitation notification created:', notification.id);
                console.log('🔍 Notification payload was:', notificationPayload);
                  }
                } else {
                  console.log('ℹ️ User not found for email, skipping in-app notification (email will still be sent)');
                }
              } catch (notificationError) {
                console.error('❌ Error creating collaborator invitation notification:', notificationError);
                // Don't fail invitation creation if notification fails
              }

              // Resend existing invitation using send-notification-email edge function
              try {
                const emailPayload = {
                  email: email,
                  notification_type: 'collaborator_invitation',
                  event_id: eventId,
                  event_name: eventName,
                  inviter_name: inviterName,
                  invitation_token: existingInvitation.invitation_token,
                  permission_level: existingInvitation.role,
                  invitation_url: `https://revayahost.com/#/collaborator-invite-response?token=${existingInvitation.invitation_token}`
                };

                const response = await fetch(`${window.supabaseClient.supabaseUrl}/functions/v1/send-notification-email`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.supabaseClient.supabaseKey}`
                  },
                  body: JSON.stringify(emailPayload)
                });

                if (!response.ok) {
                  throw new Error(`Email service responded with ${response.status}`);
                }

                console.log('✅ Collaborator invitation resend via send-notification-email');
                resent = true;
              } catch (emailError) {
                console.error('❌ Collaborator invitation resend failed (non-blocking):', emailError);
              }
              continue;
            } else {
              // For declined/expired/removed invitations, delete the old one and create a new one
              await window.supabaseClient
                .from('event_collaborator_invitations')
                .delete()
                .eq('event_id', eventId)
                .eq('email', email);
              console.log(`🗑️ Deleted old invitation for ${email} with status: ${existingInvitation.status}`);
            }
          }

          // Create new invitation
          const invitationToken = generateInvitationToken();
          
          const { data: invitationData, error } = await window.supabaseClient
            .from('event_collaborator_invitations')
            .insert({
              event_id: eventId,
              email,
              role,
              status: 'pending',
              invitation_token: invitationToken,
              invited_by: session.user.id,
              invited_by_name: session.user.email
            })
            .select()
            .single();

          if (error) {
            errors.push(`${email}: ${error.message}`);
            continue;
          }

          // Get event details for email
          const { data: eventData } = await window.supabaseClient
            .from('events')
            .select('name, title')
            .eq('id', eventId)
            .single();

          const eventName = eventData?.name || eventData?.title || 'Event';

          // Get inviter profile details
          const { data: profileData } = await window.supabaseClient
            .from('profiles')
            .select('full_name, email')
            .eq('id', session.user.id)
            .single();

          const inviterName = profileData?.full_name || profileData?.email || session.user.email;

          // Create notification in notifications table for the invited user (if they have an account)
          try {
            console.log('🔍 collaboratorAPI: Looking up user by email:', email);
            // First, try to find the user by email
            const { data: invitedUser, error: userLookupError } = await window.supabaseClient
              .from('profiles')
              .select('id, full_name, email')
              .eq('email', email)
              .single();

            if (invitedUser) {
              console.log('✅ collaboratorAPI: Found user, creating notification:', invitedUser.id);
              // User exists, create notification in notifications table
              const notificationPayload = {
                user_id: invitedUser.id,
                type: 'collaborator_invitation',
                title: '🤝 Collaboration Invitation',
                message: `${inviterName} invited you to collaborate on "${eventName}"`,
                event_id: eventId,
                metadata: {
                  invitation_token: invitationToken,
                  inviter_name: inviterName,
                  inviter_id: session.user.id,
                  event_name: eventName,
                  role: role,
                  invitation_id: invitationData.id,
                  permission_level: role
                }
              };

              const { data: notification, error: notifError } = await window.supabaseClient
                .from('notifications')
                .insert([notificationPayload])
                .select()
                .single();

              if (notifError) {
                console.error('❌ Failed to create collaborator invitation notification:', notifError);
              } else {
                console.log('✅ Collaborator invitation notification created:', notification.id);
                console.log('🔍 Notification payload was:', notificationPayload);
              }
            } else {
              console.log('ℹ️ User not found for email, skipping in-app notification (email will still be sent)');
            }
          } catch (notificationError) {
            console.error('❌ Error creating collaborator invitation notification:', notificationError);
            // Don't fail invitation creation if notification fails
          }

          // Send email invitation using send-notification-email edge function
          try {
            const emailPayload = {
              email: email,
              notification_type: 'collaborator_invitation',
              event_id: eventId,
              event_name: eventName,
              inviter_name: inviterName,
              invitation_token: invitationToken,
              permission_level: role,
              invitation_url: `https://revayahost.com/#/collaborator-invite-response?token=${invitationToken}`
            };

            const response = await fetch(`${window.supabaseClient.supabaseUrl}/functions/v1/send-notification-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.supabaseClient.supabaseKey}`
              },
              body: JSON.stringify(emailPayload)
            });

            if (!response.ok) {
              throw new Error(`Email service responded with ${response.status}`);
            }

            console.log('✅ Collaborator invitation email sent via send-notification-email');
          } catch (emailError) {
            console.error('❌ Collaborator invitation email failed (non-blocking):', emailError);
            // Don't fail invitation creation if email fails
          }

          invited.push(email);
        } catch (error) {
          errors.push(`${email}: ${error.message}`);
        }
      }

      // Dispatch update events
      if (window.eventBus?.emit) {
        window.eventBus.emit('collaboratorUpdated');
        window.eventBus.emit('eventsUpdated');
      }

      let message = '';
      if (invited.length > 0) {
        message = `Successfully invited ${invited.length} collaborator${invited.length === 1 ? '' : 's'}`;
      } else if (resent) {
        message = 'Invitations resent to existing pending invitations';
      } else {
        message = 'No new invitations were sent';
      }

      if (errors.length > 0) {
        message += `. ${errors.length} invitation${errors.length === 1 ? '' : 's'} failed.`;
      }


      return {
        success: true,
        invited,
        errors,
        message,
        resent,
        reminder
      };
    } catch (error) {
      throw error;
    }
  }
};

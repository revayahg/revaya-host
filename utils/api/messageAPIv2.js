// MessageAPIv2 - Performance Optimized - Updated 2025-01-04
(function () {
  const THREAD_PAGE_SIZE = 50;

  function fmtPreview(text) {
    const t = (text || '').trim();
    return t.length <= 140 ? t : t.slice(0, 137) + '…';
  }

  const api = {
    init({ supabase, realtime = true } = {}) {
      this.sb = supabase || window.supabaseClient;
      this.realtime = realtime;
      this._subs = new Map();
      this.threadCache = new Map(); // Cache for thread data
      this.messageCache = new Map(); // Cache for messages
      this.identityCache = new Map(); // Cache for user identities
      this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache timeout
      
      if (!this.sb) {
        throw new Error('Supabase client is required for MessageAPIv2');
      }
      
      return this;
    },

    // Simplified thread access using direct database queries with caching
    async ensureEventGroupThread(eventId) {
      if (!this.sb) {
        if (window.supabaseClient) {
          this.init({ supabase: window.supabaseClient });
        } else {
          throw new Error('MessageAPIv2 not initialized and no supabase client available');
        }
      }
      
      if (!eventId) throw new Error('Event ID is required');
      
      // Check cache first
      const cacheKey = `thread_${eventId}`;
      const cached = this.threadCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        return cached.data;
      }
      
      try {
        
        // Get current user with enhanced error handling
        let user = null;
        try {
          const { data: { user: authUser }, error: userError } = await this.sb.auth.getUser();
          if (userError) {
            // Try session fallback
            const session = await window.getSessionSafe?.();
            user = session?.user || null;
          } else {
            user = authUser;
          }
        } catch (authError) {
          // Try session fallback
          try {
            const session = await window.getSessionSafe?.();
            user = session?.user || null;
          } catch (sessionError) {
          }
        }
        
        if (!user?.id) {
          throw new Error('Authentication required');
        }
        
        
        // Check if user has proper event access by ensuring they have a role
        
        // First check if user is event owner
        const { data: eventData, error: eventError } = await this.sb
          .from('events')
          .select('user_id, created_by, name')
          .eq('id', eventId)
          .single();
        
        if (eventError) {
          throw new Error('Event not found or access denied');
        }
        
        const isOwner = eventData && (eventData.user_id === user.id || eventData.created_by === user.id);
        
        // Check for existing role
        const { data: existingRole } = await this.sb
          .from('event_user_roles')
          .select('role, status')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .single();
        
        
        // If user is owner but doesn't have role, create one
        if (isOwner && !existingRole) {
          const { error: roleError } = await this.sb
            .from('event_user_roles')
            .upsert({
              event_id: eventId,
              user_id: user.id,
              role: 'admin',
              status: 'active'
            });
          
          if (roleError) {
          }
        } else if (!existingRole && !isOwner) {
          throw new Error('Access denied: You are not a collaborator or owner of this event');
        }
        
        
        // Look for existing thread with detailed debugging
        const { data: existingThreads, error: selectError } = await this.sb
          .from('message_threads')
          .select('*')
          .eq('event_id', eventId)
          .eq('subject', 'Event Team Chat');
        
        
        if (selectError) {
          if (selectError.message && selectError.message.includes('row-level security')) {
            throw new Error('Permission denied: Cannot access messaging for this event. Database policies need updating.');
          }
          throw selectError;
        }
          
        let thread = existingThreads?.[0] || null;
        
        // Create thread if it doesn't exist
        if (!thread) {
          const threadData = {
            event_id: eventId,
            subject: 'Event Team Chat',
            created_at: new Date().toISOString()
          };
          
          const { data: newThread, error: createError } = await this.sb
            .from('message_threads')
            .insert(threadData)
            .select()
            .single();
            
            
          if (createError) {
            
            if (createError.message && createError.message.includes('row-level security')) {
              throw new Error('Permission denied: Unable to create message thread. Database policies need updating - run SQL script 183.');
            }
            
            throw createError;
          }
          
          thread = newThread;
        }
        
        // Ensure current user is a participant
        if (thread) {
          const { data: participantData, error: participantError } = await this.sb
            .from('message_participants')
            .upsert({
              thread_id: thread.id,
              user_id: user.id
            }, { onConflict: 'thread_id,user_id' })
            .select();
            
        }
        
        // Get participants with detailed logging
        const { data: participants, error: participantsError } = await this.sb
          .from('message_participants')
          .select('user_id, last_read_at')
          .eq('thread_id', thread?.id || '');
        
        
        // Thread and participants loaded successfully
        
        const result = {
          thread: thread,
          participants: participants || []
        };
        
        // Cache the result
        this.threadCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        
        return result;
        
      } catch (error) {
        
        if (error.message?.includes('infinite recursion detected')) {
          return { thread: null, participants: [] };
        }
        
        // Better error handling for RLS violations
        if (error.message && error.message.includes('row-level security')) {
          throw new Error('Access denied: Messaging permissions need to be configured. Please run SQL script 183.');
        }
        
        throw error;
      }
    },

    // Fetch participants for a thread
    async listParticipants(threadId) {
      const { data, error } = await this.sb
        .from('message_participants')
        .select('user_id, last_read_at')
        .eq('thread_id', threadId);
      if (error) throw error;
      return data || [];
    },

    // Resolve user identities (name/email) in bulk
    async getUserIdentities(userIds = []) {
      if (!userIds.length) return [];
      try {
        // Try the RPC function first
        const { data, error } = await this.sb
          .rpc('get_user_identity_bulk', { p_user_ids: userIds });
        if (!error && data) return data;
        
        // Fallback to profiles table direct query
        const { data: profiles, error: profileError } = await this.sb
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);
        
        if (profileError) throw profileError;
        
        return (profiles || []).map(p => ({
          user_id: p.id,
          display_name: p.first_name && p.last_name 
            ? `${p.first_name} ${p.last_name}`
            : p.email || 'Unknown User',
          email: p.email
        }));
      } catch (error) {
        return [];
      }
    },

    // List visible threads (RLS on message_threads decides visibility).
    // Then merge *my* last_read_at via a second query to avoid fragile inner joins.
    async listThreads() {
      try {
        let uid = null;
        try {
          if (this.sb.auth.getUser) {
            const { data: { user }, error } = await this.sb.auth.getUser();
            uid = error ? null : user?.id;
          }
          if (!uid) {
            const session = await window.getSessionSafe?.();
            uid = session?.user?.id;
          }
          if (!uid) {
            uid = window.AuthContext?.user?.id;
          }
        } catch (error) {
          const session = await window.getSessionSafe?.();
          uid = session?.user?.id;
        }
        if (!uid) {
          return [];
        }
        const { data, error } = await this.sb
          .from('message_threads')
          .select('id, event_id, subject, last_message_at, last_message_preview, created_at, is_archived')
          .order('last_message_at', { ascending: false })
          .limit(100);
        if (error) {
          if (error.message?.includes('infinite recursion detected')) {
            return [];
          }
          throw error;
        }
        const threads = data || [];
        if (!threads.length) return threads;

        const ids = threads.map(t => t.id);
        const { data: myParts, error: mpErr } = await this.sb
          .from('message_participants')
          .select('thread_id, last_read_at')
          .in('thread_id', ids)
          .eq('user_id', uid);
        if (mpErr) throw mpErr;
        const byThread = new Map((myParts || []).map(r => [r.thread_id, r.last_read_at]));
        return threads.map(t => ({ ...t, my_last_read_at: byThread.get(t.id) || null }));
      } catch (error) {
        if (error.message?.includes('infinite recursion detected')) {
          return [];
        }
        throw error;
      }
    },

    // Scoped list by event (Sprint-1 uses one group thread per event)  
    async listThreadsByEvent(eventId) {
      try {
        let uid = null;
        try {
          if (this.sb.auth.getUser) {
            const { data: { user }, error } = await this.sb.auth.getUser();
            uid = error ? null : user?.id;
          }
          if (!uid) {
            const session = await window.getSessionSafe?.();
            uid = session?.user?.id;
          }
          if (!uid) {
            uid = window.AuthContext?.user?.id;
          }
        } catch (error) {
          const session = await window.getSessionSafe?.();
          uid = session?.user?.id;
        }
        if (!uid) {
          return [];
        }
        const { data, error } = await this.sb
          .from('message_threads')
          .select('id, event_id, subject, last_message_at, last_message_preview, created_at, is_archived')
          .eq('event_id', eventId)
          .order('last_message_at', { ascending: false });
        if (error) {
          if (error.message?.includes('infinite recursion detected')) {
            return [];
          }
          throw error;
        }
        const threads = data || [];
        if (!threads.length) return threads;

        const ids = threads.map(t => t.id);
        const { data: myParts, error: mpErr } = await this.sb
          .from('message_participants')
          .select('thread_id, last_read_at')
          .in('thread_id', ids)
          .eq('user_id', uid);
        if (mpErr) throw mpErr;
        const byThread = new Map((myParts || []).map(r => [r.thread_id, r.last_read_at]));
        return threads.map(t => ({ ...t, my_last_read_at: byThread.get(t.id) || null }));
      } catch (error) {
        if (error.message?.includes('infinite recursion detected')) {
          return [];
        }
        throw error;
      }
    },

    // Optionally fetch a single thread (future-proofing)
    async getThread(threadId) {
      const { data, error } = await this.sb
        .from('message_threads')
        .select('id, event_id, subject, last_message_at, last_message_preview, created_at, is_archived')
        .eq('id', threadId)
        .single();
      if (error) throw error;
      return data;
    },

    // Messages (last 12 months enforced by RLS); paginate older via before
    async listMessages(threadId, { limit = THREAD_PAGE_SIZE, before } = {}) {
      try {
        let q = this.sb
          .from('messages')
          .select('id, thread_id, sender_id, body, created_at')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (before) q = q.lt('created_at', before);
        const { data, error } = await q;
        if (error) {
          if (error.message?.includes('infinite recursion detected')) {
            return [];
          }
          throw error;
        }
        return (data || []).reverse();
      } catch (error) {
        if (error.message?.includes('infinite recursion detected')) {
          return [];
        }
        throw error;
      }
    },

    async markRead(threadId) {
      try {
        const { error } = await this.sb
          .from('message_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('thread_id', threadId)
          .eq('user_id', await this.getSafeUserId());
        if (error) {
          if (error.message && error.message.includes('infinite recursion')) {
          } else {
          }
        }
      } catch (err) {
      }
    },

    // Send
    async sendMessage({ threadId, eventId, text }) {
      const body = (text || '').trim();
      if (!body) throw new Error('Message cannot be empty');

      // If no thread yet, create/ensure it first
      let tid = threadId;
      if (!tid && eventId) {
        const { thread } = await this.ensureEventGroupThread(eventId);
        tid = thread.id;
      }

      const { data, error } = await this.sb
        .from('messages')
        .insert([{ 
          thread_id: tid, 
          sender_id: await this.getSafeUserId(),
          body 
        }])
        .select()
        .single();
      if (error) {
        // Handle infinite recursion gracefully
        if (error.message && error.message.includes('infinite recursion')) {
          throw new Error('Message sending temporarily unavailable due to database policies');
        }
        throw error;
      }

      // Optimistically update thread preview
      await this.sb.from('message_threads')
        .update({ last_message_preview: fmtPreview(body), last_message_at: new Date().toISOString() })
        .eq('id', tid);


      return data;
    },

    // Subscribe to realtime inserts for a thread
    onMessage(threadId, handler) {
      const key = `thread-${threadId}`;
      if (this._subs.has(key)) return this._subs.get(key); // already subscribed

      const channel = this.sb.channel(`messages-${threadId}`);
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
        payload => { handler && handler(payload.new); }
      );
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // no-op
        }
      });

      const unsubscribe = () => {
        try { this.sb.removeChannel(channel); } catch {}
        this._subs.delete(key);
      };
      this._subs.set(key, unsubscribe);
      return unsubscribe;
    },

    // Safe user ID retrieval with multiple fallbacks
    async getSafeUserId() {
      try {
        if (this.sb.auth.getUser) {
          const { data: { user }, error } = await this.sb.auth.getUser();
          if (!error && user?.id) return user.id;
        }
        
        const session = await window.getSessionSafe?.();
        if (session?.user?.id) return session.user.id;
        
        const contextUser = window.AuthContext?.user?.id;
        if (contextUser) return contextUser;
        
        throw new Error('No user ID available');
      } catch (error) {
        throw new Error('Authentication required');
      }
    },

    // Convenience method for event group messaging (with detailed logging)
    async sendEventGroupMessage(eventId, text) {
      
      const body = (text || '').trim();
      if (!body) {
        throw new Error('Message cannot be empty');
      }
      
      const threadResult = await this.ensureEventGroupThread(eventId);
      
      const thread = threadResult?.thread;
      if (!thread?.id) {
        throw new Error('Failed to create or access thread');
      }

      const userId = await this.getSafeUserId();
      
      // Sanitize message content for security (remove dangerous HTML/scripts)
      const sanitizedBody = window.InputSanitizer ? 
        window.InputSanitizer.sanitizeDescription(body, 50000) : 
        body.trim();
      
      if (!sanitizedBody || sanitizedBody.length === 0) {
        throw new Error('Message cannot be empty');
      }
      
      const messageData = {
        thread_id: thread.id,
        sender_id: userId,
        body: sanitizedBody
      };

      const { data, error } = await this.sb
        .from('messages')
        .insert([messageData])
        .select('*')
        .single();


      if (error) {
        
        // Handle infinite recursion gracefully
        if (error.message && error.message.includes('infinite recursion')) {
          throw new Error('Message sending temporarily unavailable due to database policies');
        }
        
        if (error.message && error.message.includes('row-level security')) {
          throw new Error('Permission denied: Cannot send message. Database policies need updating - run SQL script 183.');
        }
        
        const msg = error?.message || error?.hint || 'Failed to send message';
        throw new Error(msg);
      }


      // Create notifications for all event participants (except sender)
      
      if (window.notificationAPI) {
        try {
          
          // Get all event participants
          const participants = await this.getEventParticipants(eventId);
          const senderId = await this.getSafeUserId();
          
          // Get sender name for notification
          const { data: senderProfile } = await this.sb
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', senderId)
            .single();
          
          const senderName = senderProfile ? 
            (senderProfile.first_name && senderProfile.last_name ? 
              `${senderProfile.first_name} ${senderProfile.last_name}` : 
              senderProfile.email) : 
            'Someone';


          // Create notifications for all participants except sender
          let notificationCount = 0;
          for (const participant of participants) {
            if (participant.user_id !== senderId) {
              try {
                const notificationData = {
                  userId: participant.user_id,
                  type: 'message',
                  title: `New message from ${senderName}`,
                  message: body.length > 100 ? body.substring(0, 100) + '...' : body,
                  eventId: eventId,
                  metadata: {
                    thread_id: thread.id,
                    sender_id: senderId,
                    sender_name: senderName,
                    message_id: data.id
                  }
                };
                
                const notificationResult = await window.notificationAPI.createNotification(notificationData);
                
                if (notificationResult) {
                  notificationCount++;
                } else {
                }

                // Send email notification with rate limiting
                try {
                  if (window.unifiedNotificationService && participant.email) {
                    const emailResult = await window.unifiedNotificationService.sendChatMessageEmail(
                      participant.email,
                      senderName,
                      thread.event_name || 'Event',
                      eventId,
                      body.length > 140 ? body.substring(0, 137) + '...' : body,
                      participant.user_id
                    );
                    
                    if (emailResult?.skipped) {
                      console.log(`📧 Chat email skipped for ${participant.email}: ${emailResult.reason}`);
                    } else {
                      console.log(`✅ Chat email sent to ${participant.email}`);
                    }
                  }
                } catch (emailError) {
                  console.error('❌ Chat email notification failed (non-blocking):', emailError);
                  // Don't fail message sending if email fails
                }
              } catch (notifError) {
                // Don't fail message sending if notification fails
              }
            }
          }
          
          
          // Dispatch events for real-time UI updates
          if (window.EventBus && window.EventBus.emit) {
            window.EventBus.emit('messageSent', { 
              message: data, 
              eventId: eventId, 
              participants: participants.length 
            });
          }
          
          window.dispatchEvent(new CustomEvent('messageSent', { 
            detail: { 
              message: data, 
              eventId: eventId, 
              participants: participants.length 
            } 
          }));
          
          
        } catch (notificationError) {
          // Don't fail message sending if notification fails
        }
      } else {
      }

      // Update thread preview
      try {
        const updateData = {
          last_message_preview: fmtPreview(body),
          last_message_at: new Date().toISOString()
        };
        
        const { error: updateError } = await this.sb
          .from('message_threads')
          .update(updateData)
          .eq('id', thread.id);
          
        if (updateError) {
        } else {
        }
      } catch (previewError) {
      }

      // Clear cache for this event since new message was added
      this.clearEventCache(eventId);

      return data;
    },

    // Get messages for event group thread with pagination and caching
    async getEventGroupMessages(eventId, { limit = 20, before } = {}) {
      if (!eventId) throw new Error('Event ID is required');
      
      // Check cache first (only for initial load without before parameter)
      if (!before) {
        const cacheKey = `messages_${eventId}`;
        const cached = this.messageCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
          return cached.data;
        }
      }
      
      try {
        
        // Get or create the event group thread
        const threadResult = await this.ensureEventGroupThread(eventId);
        
        const thread = threadResult?.thread;
        if (!thread?.id) {
          return [];
        }
        
        
        // Get messages from the thread using listMessages with pagination
        const messages = await this.listMessages(thread.id, { limit, before });
        
        
        if (messages && messages.length > 0) {
        } else {
        }
        
        // Cache the result (only for initial load)
        if (!before) {
          const cacheKey = `messages_${eventId}`;
          this.messageCache.set(cacheKey, {
            data: messages || [],
            timestamp: Date.now()
          });
        }
        
        return messages || [];
      } catch (error) {
        
        if (error.message?.includes('infinite recursion detected')) {
          return [];
        }
        throw error;
      }
    },

    // Mark event group thread as read
    async markEventGroupAsRead(eventId) {
      try {
        const { thread } = await this.ensureEventGroupThread(eventId);
        if (thread?.id) {
          await this.markRead(thread.id);
        }
      } catch (error) {
      }
    },

    // Get identities for users with caching
    async getIdentitiesForUsers(userIds = []) {
      if (!userIds.length) return {};
      
      // Check cache for individual users
      const result = {};
      const uncachedIds = [];
      
      for (const userId of userIds) {
        const cacheKey = `identity_${userId}`;
        const cached = this.identityCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
          result[userId] = cached.data;
        } else {
          uncachedIds.push(userId);
        }
      }
      
      // Fetch uncached identities
      if (uncachedIds.length > 0) {
        try {
          const identities = await this.getUserIdentities(uncachedIds);
          identities.forEach(id => {
            result[id.user_id] = id;
            // Cache individual identity
            this.identityCache.set(`identity_${id.user_id}`, {
              data: id,
              timestamp: Date.now()
            });
          });
        } catch (error) {
          // Continue with cached data only
        }
      }
      
      return result;
    },

    // Clear cache for specific event (useful when new messages are sent)
    clearEventCache(eventId) {
      if (eventId) {
        this.threadCache.delete(`thread_${eventId}`);
        this.messageCache.delete(`messages_${eventId}`);
      }
    },

    // Clear all caches
    clearAllCaches() {
      this.threadCache.clear();
      this.messageCache.clear();
      this.identityCache.clear();
    },

    // Get event participants for display in participant list
    async getEventParticipants(eventId) {
      if (!this.sb) throw new Error('Supabase client not initialized');
      
      try {
        const participants = [];
        const seenUserIds = new Set();
        
        // Get all active collaborators from event_user_roles (this includes the event owner if they have a role)
        const { data: collaborators } = await this.sb
          .from('event_user_roles')
          .select('user_id, role')
          .eq('event_id', eventId)
          .eq('status', 'active');
        
        if (collaborators && collaborators.length > 0) {
          for (const collab of collaborators) {
            // Skip if we've already processed this user
            if (seenUserIds.has(collab.user_id)) {
              continue;
            }
            
            const { data: profile } = await this.sb
              .from('profiles')
              .select('email, first_name, last_name')
              .eq('id', collab.user_id)
              .single();
            
            if (profile) {
              // Determine the display role - if it's admin, show as "owner", otherwise show the role
              const displayRole = collab.role === 'admin' ? 'owner' : collab.role;
              
              participants.push({
                user_id: collab.user_id,
                email: profile.email,
                display_name: profile.first_name && profile.last_name 
                  ? `${profile.first_name} ${profile.last_name}`
                  : profile.email,
                role: displayRole
              });
              
              seenUserIds.add(collab.user_id);
            }
          }
        }
        
        // If no collaborators found, try to get the event owner directly
        if (participants.length === 0) {
          const { data: event } = await this.sb
            .from('events')
            .select('created_by')
            .eq('id', eventId)
            .single();
          
          if (event?.created_by) {
            const { data: ownerProfile } = await this.sb
              .from('profiles')
              .select('email, first_name, last_name')
              .eq('id', event.created_by)
              .single();
            
            if (ownerProfile) {
              participants.push({
                user_id: event.created_by,
                email: ownerProfile.email,
                display_name: ownerProfile.first_name && ownerProfile.last_name 
                  ? `${ownerProfile.first_name} ${ownerProfile.last_name}`
                  : ownerProfile.email,
                role: 'owner'
              });
            }
          }
        }
        
        return participants;
      } catch (error) {
        return [];
      }
    },

    // Get threads for a specific event
    async getEventThreads(eventId) {
      if (!this.sb) throw new Error('Supabase client not initialized');
      
      try {
        const threads = await this.listThreadsByEvent(eventId);
        return threads;
      } catch (error) {
        if (error.message?.includes('infinite recursion detected')) {
          return [];
        }
        throw error;
      }
    },

    // Get or create thread (fallback method)
    async getOrCreateThread(eventId, subject = 'Event Team Chat') {
      if (!this.sb) throw new Error('Supabase client not initialized');
      
      try {
        const { thread } = await this.ensureEventGroupThread(eventId);
        return thread;
      } catch (error) {
        if (error.message?.includes('infinite recursion detected')) {
          return null;
        }
        throw error;
      }
    },
  };

  window.messageAPIv2 = api;
})();
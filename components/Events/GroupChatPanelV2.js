function GroupChatPanelV2({ eventId, currentUser }) {

  if (!currentUser?.id) {
    return React.createElement('div', { 
      className: 'flex items-center justify-center h-32 text-gray-500' 
    }, 'Authentication required for messaging');
  }
  
  const [messages, setMessages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [pendingIds, setPendingIds] = React.useState(new Set());
  const [identities, setIdentities] = React.useState({});
  const [errorText, setErrorText] = React.useState('');
  const [participants, setParticipants] = React.useState([]);
  const [showParticipants, setShowParticipants] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [lastReadAt, setLastReadAt] = React.useState(null);
  const [error, setError] = React.useState('');

  const scrollerRef = React.useRef(null);

  const scrollToBottom = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, left: 0, behavior: 'auto' });
  }, []);

  const loadParticipants = React.useCallback(async () => {
    if (!eventId) return;
    
    try {
      const participantData = await window.messageAPIv2.getEventParticipants(eventId);
      setParticipants(participantData || []);
    } catch (error) {
    }
  }, [eventId]);

  const loadMessages = React.useCallback(async () => {
    if (!eventId || !currentUser?.id) {
      return;
    }
    
    
    try {
      // Initialize messageAPIv2 if needed
      if (!window.messageAPIv2?.sb) {
        window.messageAPIv2?.init({ supabase: window.supabaseClient });
      }
      
      setError('');
      setLoading(true);
      
      const msgs = await window.messageAPIv2.getEventGroupMessages(eventId, { limit: 20 });
      
      setMessages(msgs || []);
      
      // Get last read timestamp for unread calculation
      try {
        const { thread } = await window.messageAPIv2.ensureEventGroupThread(eventId);
        if (thread?.id) {
          const { data: participant } = await window.supabaseClient
            .from('message_participants')
            .select('last_read_at')
            .eq('thread_id', thread.id)
            .eq('user_id', currentUser.id)
            .single();
          
          const lastRead = participant?.last_read_at;
          setLastReadAt(lastRead);
          
          // Count unread messages
          if (lastRead && msgs && msgs.length > 0) {
            const unreadMessages = msgs.filter(m => 
              m.sender_id !== currentUser.id && 
              new Date(m.created_at) > new Date(lastRead)
            );
            setUnreadCount(unreadMessages.length);
          } else if (!lastRead && msgs) {
            // If never read, count all messages from others
            const unreadMessages = msgs.filter(m => m.sender_id !== currentUser.id);
            setUnreadCount(unreadMessages.length);
          }
        }
      } catch (error) {
      }
      
      // Fetch user identities for message senders
      if (msgs && msgs.length > 0) {
        const senderIds = [...new Set(msgs.map(m => m.sender_id).filter(Boolean))];
        
        try {
          const userIdentities = await window.messageAPIv2.getUserIdentities(senderIds);
          
          // Convert array format to object format for easier lookup
          const identitiesMap = {};
          (userIdentities || []).forEach(identity => {
            identitiesMap[identity.user_id] = {
              name: identity.display_name,
              email: identity.email
            };
          });
          
          setIdentities(identitiesMap);
        } catch (identityError) {
          setIdentities({});
        }
      }
      
      try {
        await window.messageAPIv2.markEventGroupAsRead(eventId);
        setUnreadCount(0); // Reset after marking as read
      } catch (markError) {
      }
      
    } catch (error) {
      
      const errorMsg = error.message || 'Failed to load messages';
      
      // Handle specific error types gracefully
      if (error.message?.includes('infinite recursion detected')) {
        setMessages([]);
        setIdentities({});
        setError('');
      } else if (errorMsg.includes('permission') || errorMsg.includes('access')) {
        setError('Access denied - you may not have permission to view this chat');
      } else if (errorMsg.includes('Event not found')) {
        setError('Event chat not available');
      } else if (errorMsg.includes('Authentication required')) {
        setError('Please log in to access event chat');
      } else {
        setError('Unable to load chat messages. Please try refreshing the page.');
      }
    } finally {
      setLoading(false);
    }
  }, [eventId, currentUser?.id]);

  React.useEffect(() => {
    
    // Initialize messageAPIv2 if not already done
    if (!window.messageAPIv2?.sb && window.supabaseClient) {
      if (window.messageAPIv2?.init) {
        window.messageAPIv2.init({ supabase: window.supabaseClient });
      }
    }
    
    if (eventId && currentUser?.id) {
      // Add a small delay to ensure initialization is complete
      const timer = setTimeout(() => {
        loadMessages();
        loadParticipants();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [eventId, currentUser?.id, loadMessages, loadParticipants]);

  const ParticipantsList = () => (
    React.createElement('div', { className: 'bg-white border-l border-gray-200 w-64 flex-shrink-0' }, [
      React.createElement('div', { key: 'header', className: 'p-4 border-b border-gray-200' },
        React.createElement('h3', { className: 'font-semibold text-gray-900' }, 
          `Event Participants (${participants.length})`
        )
      ),
      React.createElement('div', { key: 'list', className: 'overflow-y-auto max-h-96' },
        participants.map((participant, index) => 
          React.createElement('div', { 
            key: index, 
            className: 'p-3 border-b border-gray-100 hover:bg-gray-50' 
          }, [
            React.createElement('div', { key: 'content', className: 'flex items-center space-x-3' }, [
              React.createElement('div', { 
                key: 'avatar',
                className: 'w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center' 
              },
                React.createElement('span', { className: 'text-sm font-medium text-indigo-600' },
                  (participant.display_name || participant.email || 'U').charAt(0).toUpperCase()
                )
              ),
              React.createElement('div', { key: 'info', className: 'flex-1 min-w-0' }, [
                React.createElement('p', { 
                  key: 'name',
                  className: 'text-sm font-medium text-gray-900 truncate' 
                }, participant.display_name || participant.email),
                participant.display_name && React.createElement('p', { 
                  key: 'email',
                  className: 'text-xs text-gray-500 truncate' 
                }, participant.email),
                React.createElement('p', { 
                  key: 'role',
                  className: 'text-xs text-gray-400 capitalize' 
                }, participant.role || 'participant')
              ])
            ])
          ])
        )
      )
    ])
  );

  return React.createElement('div', { className: 'flex h-[500px]' }, [
    React.createElement('div', { key: 'main', className: 'flex flex-col flex-1' }, [
      React.createElement('div', { key: 'header', className: 'border-b p-3 bg-gray-50' }, [
        React.createElement('div', { key: 'header-content', className: 'flex items-center justify-between' }, [
          React.createElement('div', { key: 'title-section' }, [
            React.createElement('div', { key: 'title-row', className: 'flex items-center gap-2' }, [
              React.createElement('h3', { key: 'title', className: 'font-medium text-gray-900' }, 'Event Team Chat'),
              unreadCount > 0 && React.createElement('span', { 
                key: 'unread-badge',
                className: 'bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] h-5 flex items-center justify-center'
              }, unreadCount)
            ]),
            React.createElement('p', { key: 'subtitle', className: 'text-sm text-gray-600' }, 
              `${participants.length} participants`)
          ]),
          React.createElement('button', {
            key: 'participants-btn',
            onClick: () => setShowParticipants(!showParticipants),
            className: `p-2 rounded-lg transition-colors ${
              showParticipants 
                ? 'bg-indigo-100 text-indigo-600' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`,
            title: 'Toggle participants list'
          },
            React.createElement('div', { className: 'icon-users text-xl' })
          )
        ]),
        (errorText || error) && React.createElement('div', { 
          key: 'error', 
          className: 'mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1' 
        }, errorText || error)
      ]),
      React.createElement('div', { 
        key: 'messages', 
        ref: scrollerRef, 
        className: 'flex-1 overflow-y-auto overscroll-contain p-3' 
      }, [
        loading
          ? React.createElement('div', { key: 'loading', className: 'flex items-center justify-center h-32 text-gray-500' }, 'Loading messages...')
          : error
            ? React.createElement('div', { key: 'error-state', className: 'flex items-center justify-center h-32 text-red-600 text-sm' }, error)
            : (messages.length === 0
                ? React.createElement('div', { key: 'empty', className: 'flex items-center justify-center h-32 text-gray-400 text-sm' }, 'No messages yet — start the conversation.')
                : React.createElement(window.MessageListV2, {
                    key: 'message-list',
                    messages,
                    currentUserId: currentUser?.id,
                    identities,
                    isPending: (id) => pendingIds.has(id),
                    lastReadAt
                  })
              )
      ]),
      React.createElement('div', { key: 'input', className: 'p-3' },
        React.createElement(window.SendMessageFormV2, {
          disabled: sending,
          onSend: async (text) => {
            if (!text.trim() || sending || !currentUser?.id) return;
            
            if (!window.messageAPIv2?.sb) {
              window.messageAPIv2?.init({ supabase: window.supabaseClient });
            }
            
            setErrorText('');
            const tempId = 'pending-' + Date.now();
            const optimisticMessage = {
              id: tempId,
              thread_id: null,
              sender_id: currentUser.id,
              body: text.trim(),
              created_at: new Date().toISOString()
            };

            setPendingIds(prev => new Set([...prev, tempId]));
            setMessages(prev => [...prev, optimisticMessage]);
            setTimeout(scrollToBottom, 0);
            
            setSending(true);
            
            try {
              const realMessage = await window.messageAPIv2.sendEventGroupMessage(eventId, text.trim());
              setMessages(prev => prev.map(m => m.id === tempId ? realMessage : m));
              setPendingIds(prev => {
                const next = new Set(prev);
                next.delete(tempId);
                return next;
              });
              
              await window.messageAPIv2.markEventGroupAsRead(eventId);
              setTimeout(scrollToBottom, 0);
            } catch (error) {
              setErrorText(error?.message || 'Failed to send message');
              setMessages(prev => prev.filter(m => m.id !== tempId));
              setPendingIds(prev => {
                const next = new Set(prev);
                next.delete(tempId);
                return next;
              });
            } finally {
              setSending(false);
            }
          }
        })
      )
    ]),
    showParticipants && React.createElement(ParticipantsList, { key: 'participants' })
  ]);
}
window.GroupChatPanelV2 = GroupChatPanelV2;
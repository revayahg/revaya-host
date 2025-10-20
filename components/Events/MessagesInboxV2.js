function MessagesInboxV2({ eventId, currentUser }) {
  const [threads, setThreads] = React.useState([]);
  const [activeThread, setActiveThread] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [userEvents, setUserEvents] = React.useState([]);
  const [showNewMessage, setShowNewMessage] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState(null);

  React.useEffect(() => {
    loadUserEvents();
    if (eventId) {
      loadThreadsForEvent(eventId);
    } else {
      loadAllThreads();
    }
    
    // Listen for new messages - poll every 30 seconds
    const interval = setInterval(() => {
      if (eventId) {
        loadThreadsForEvent(eventId);
      } else {
        loadAllThreads();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [eventId]);

  const loadUserEvents = async () => {
    try {
      const user = await window.supabaseClient.auth.getUser();
      if (!user.data.user) return;

      const { data: events } = await window.supabaseClient
        .from('events')
        .select('id, title')
        .eq('created_by', user.data.user.id);

      setUserEvents(events || []);
    } catch (error) {
    }
  };

  const loadThreadsForEvent = async (eventId) => {
    try {
      setLoading(true);
      const threads = await window.messageAPIv2.getEventThreads(eventId);
      setThreads(threads || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const loadAllThreads = async () => {
    try {
      setLoading(true);
      // Load threads from all user events
      const allThreads = [];
      for (const event of userEvents) {
        const eventThreads = await window.messageAPIv2.getEventThreads(event.id);
        allThreads.push(...(eventThreads || []));
      }
      setThreads(allThreads);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = async (event) => {
    try {
      const thread = await window.messageAPIv2.getOrCreateThread(event.id, 'Event Team Chat');
      setActiveThread(thread);
      setShowNewMessage(false);
      setSelectedEvent(null);
      if (eventId) {
        await loadThreadsForEvent(eventId);
      } else {
        await loadAllThreads();
      }
    } catch (error) {
    }
  };

  return React.createElement('div', { className: 'h-screen bg-gray-50 flex' }, [
    React.createElement('div', { key: 'sidebar', className: 'w-80 bg-white border-r border-gray-200 flex flex-col' }, [
      React.createElement('div', { key: 'header', className: 'p-4 border-b border-gray-200' }, [
        React.createElement('div', { key: 'title-row', className: 'flex items-center justify-between' }, [
          React.createElement('div', { key: 'titles' }, [
            React.createElement('h1', { key: 'main-title', className: 'text-lg font-semibold text-gray-900' }, 'Messages'),
            React.createElement('p', { key: 'subtitle', className: 'text-sm text-gray-600' }, 'Event conversations')
          ]),
          React.createElement('button', {
            key: 'new-btn',
            onClick: () => setShowNewMessage(!showNewMessage),
            className: 'p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors',
            title: 'New message'
          }, React.createElement('div', { className: 'icon-plus text-lg' }))
        ])
      ]),
      
      showNewMessage && React.createElement('div', { key: 'new-form', className: 'p-4 border-b border-gray-200 bg-gray-50' }, [
        React.createElement('h3', { key: 'form-title', className: 'text-sm font-medium text-gray-900 mb-3' }, 'Start New Conversation'),
        React.createElement('select', {
          key: 'event-select',
          value: selectedEvent?.id || '',
          onChange: (e) => {
            const event = userEvents.find(ev => ev.id === e.target.value);
            setSelectedEvent(event);
          },
          className: 'w-full p-2 border border-gray-300 rounded-lg text-sm mb-3'
        }, [
          React.createElement('option', { key: 'default', value: '' }, 'Select an event...'),
          ...userEvents.map(event => 
            React.createElement('option', { key: event.id, value: event.id }, event.title)
          )
        ]),
        React.createElement('div', { key: 'buttons', className: 'flex space-x-2' }, [
          React.createElement('button', {
            key: 'start',
            onClick: () => selectedEvent && startNewConversation(selectedEvent),
            disabled: !selectedEvent,
            className: 'flex-1 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors'
          }, 'Start Chat'),
          React.createElement('button', {
            key: 'cancel',
            onClick: () => {
              setShowNewMessage(false);
              setSelectedEvent(null);
            },
            className: 'px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors'
          }, 'Cancel')
        ])
      ]),

      React.createElement('div', { key: 'threads', className: 'flex-1 overflow-y-auto' },
        React.createElement(window.ThreadListV2, {
          threads,
          onOpen: setActiveThread,
          currentUserId: currentUser?.id
        })
      )
    ]),

    React.createElement('div', { key: 'main', className: 'flex-1 flex flex-col' },
      activeThread
        ? React.createElement(window.GroupChatPanelV2, {
            key: `chat-${activeThread.id}`,
            eventId: activeThread.event_id,
            currentUser
          })
        : React.createElement('div', { className: 'flex items-center justify-center h-full text-gray-500' }, [
            React.createElement('div', { key: 'empty-state', className: 'text-center' }, [
              React.createElement('div', { key: 'icon', className: 'icon-message-circle text-6xl text-gray-300 mb-4' }),
              React.createElement('h3', { key: 'title', className: 'text-lg font-medium text-gray-900 mb-2' }, 'Select a conversation'),
              React.createElement('p', { key: 'subtitle', className: 'text-gray-600' }, 'Choose a thread from the sidebar to start messaging')
            ])
          ])
    )
  ]);
}
window.MessagesInboxV2 = MessagesInboxV2;

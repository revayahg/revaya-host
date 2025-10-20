function ThreadListV2({ threads = [], onOpen }) {
  const listRef = React.useRef(null);
  const [idx, setIdx] = React.useState(0);
  const [unreadThreads, setUnreadThreads] = React.useState(new Set());
  
  // Check for unread status based on localStorage read timestamps
  React.useEffect(() => {
    const readThreads = JSON.parse(localStorage.getItem('readThreads') || '{}');
    const newUnreadThreads = new Set();
    
    threads.forEach(thread => {
      const lastRead = readThreads[thread.id];
      const lastMessageTime = thread.last_message_at ? new Date(thread.last_message_at).getTime() : 0;
      
      if (!lastRead || lastMessageTime > lastRead) {
        // Only mark as unread if there are actually messages and they're not from the current user
        if (thread.last_message_at && thread.last_message_sender_id !== window.currentUser?.id) {
          newUnreadThreads.add(thread.id);
        }
      }
    });
    
    setUnreadThreads(newUnreadThreads);
  }, [threads]);

  const markThreadAsRead = (threadId) => {
    // Update localStorage to mark thread as read
    const readThreads = JSON.parse(localStorage.getItem('readThreads') || '{}');
    readThreads[threadId] = Date.now();
    localStorage.setItem('readThreads', JSON.stringify(readThreads));
    
    // Remove from unread set
    setUnreadThreads(prev => {
      const newSet = new Set(prev);
      newSet.delete(threadId);
      return newSet;
    });
  };

  const handleThreadOpen = (thread) => {
    markThreadAsRead(thread.id);
    if (onOpen) onOpen(thread);
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  if (!threads || threads.length === 0) {
    return React.createElement('div', { 
      className: 'w-64 border-r pr-2 h-full overflow-y-auto bg-white flex flex-col items-center justify-center text-gray-400 text-sm p-4' 
    }, [
      React.createElement('div', { key: 'icon', className: 'icon-message-circle text-3xl mb-2' }),
      React.createElement('p', { key: 'text' }, 'No threads yet for this event')
    ]);
  }

  const handleKey = (e) => {
    if (!threads?.length) return;
    if (e.key === 'ArrowDown') { 
      e.preventDefault(); 
      setIdx(i => Math.min(i + 1, threads.length - 1)); 
    }
    if (e.key === 'ArrowUp') { 
      e.preventDefault(); 
      setIdx(i => Math.max(i - 1, 0)); 
    }
    if (e.key === 'Enter') { 
      e.preventDefault(); 
      handleThreadOpen(threads[idx]); 
    }
  };

  React.useEffect(() => {
    const el = listRef.current; 
    if (!el) return;
    const active = el.querySelector('[data-active="true"]');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }, [idx, threads]);

  return React.createElement('div', {
      className: 'w-64 border-r pr-2 h-full overflow-y-auto bg-white',
      role: 'listbox',
      'aria-label': 'Message threads',
      tabIndex: 0,
      onKeyDown: handleKey,
      ref: listRef
    },
    (threads || []).map((thread, i) => {
      const unread = unreadThreads.has(thread.id);
      const active = i === idx;
      const preview = thread.last_message_preview && thread.last_message_preview.trim().length 
        ? thread.last_message_preview 
        : 'No messages yet';
      const ts = thread.last_message_at || thread.created_at || null;
      
      return React.createElement('button', {
        key: thread.id,
        'data-active': active ? 'true' : 'false',
        role: 'option',
        'aria-selected': active ? 'true' : 'false',
        onClick: () => handleThreadOpen(thread),
        className: `w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors relative ${
          active ? 'ring-2 ring-indigo-200' : 'hover:bg-gray-100'
        }`
      }, [
        // Unread indicator dot
        unread && React.createElement('div', { 
          key: 'unread-dot', 
          className: 'absolute top-2 left-1 w-2 h-2 rounded-full bg-indigo-600' 
        }),
        React.createElement('div', { 
          key: 'content', 
          className: 'ml-3' 
        }, [
          React.createElement('div', { key: 'header', className: 'text-sm flex items-center justify-between' }, [
            React.createElement('span', { 
              key: 'subject', 
              className: `truncate ${unread ? 'font-semibold' : ''}` 
            }, thread.subject || 'Event Team Chat'),
            unread && React.createElement('span', { 
              key: 'new-badge', 
              className: 'bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full ml-2' 
            }, 'new')
          ]),
          React.createElement('div', { 
            key: 'preview', 
            className: `text-xs text-gray-500 truncate ${unread ? 'font-medium' : ''}` 
          }, preview),
          ts && React.createElement('div', { 
            key: 'timestamp', 
            className: 'text-[11px] text-gray-400' 
          }, formatTime(ts))
        ])
      ]);
    })
  );
}
window.ThreadListV2 = ThreadListV2;
function MessageListV2({ messages = [], currentUserId, identities = {}, isPending = (id)=>false, lastReadAt = null }) {
  const prettyFromEmail = (email='') => {
    const name = String(email).split('@')[0] || '';
    return name.split(/[._-]+/).filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  };
  
  const renderInline = (text='') => {
    let parts = [String(text)];

    // code spans first
    const codeRegex = /(`[^`]+`)/g;
    parts = parts.flatMap(chunk => String(chunk).split(codeRegex).map(seg => {
      if (/^`[^`]+`$/.test(seg)) {
        return React.createElement('code', { 
          className: 'px-1 rounded bg-gray-200 text-gray-800', 
          key: Math.random() 
        }, seg.slice(1, -1));
      }
      return seg;
    }));

    // bold
    const boldRegex = /(\*\*[^*]+\*\*)/g;
    parts = parts.flatMap(chunk => typeof chunk === 'string'
      ? chunk.split(boldRegex).map(seg => /^\*\*[^*]+\*\*$/.test(seg)
          ? React.createElement('strong', { key: Math.random() }, seg.slice(2, -2))
          : seg)
      : [chunk]);

    // underline
    const underlineRegex = /(__[^_]+__)/g;
    parts = parts.flatMap(chunk => typeof chunk === 'string'
      ? chunk.split(underlineRegex).map(seg => /^__[^_]+__$/.test(seg)
          ? React.createElement('u', { key: Math.random() }, seg.slice(2, -2))
          : seg)
      : [chunk]);

    // italic
    const italRegex = /(\*[^*]+\*)/g;
    parts = parts.flatMap(chunk => typeof chunk === 'string'
      ? chunk.split(italRegex).map(seg => /^\*[^*]+\*$/.test(seg)
          ? React.createElement('em', { key: Math.random() }, seg.slice(1, -1))
          : seg)
      : [chunk]);

    // autolink last
    parts = parts.flatMap(chunk => typeof chunk === 'string'
      ? chunk.split(/(https?:\/\/\S+)/g).map(seg =>
          /^https?:\/\//.test(seg)
            ? React.createElement('a', { 
                key: Math.random(), 
                href: seg, 
                target: '_blank', 
                rel: 'noreferrer', 
                className: 'underline break-words' 
              }, seg)
            : seg)
      : [chunk]);

    return parts;
  };
  
  return React.createElement('div', { 
    className: 'space-y-3', 
    role: 'log', 
    'aria-live': 'polite', 
    'aria-relevant': 'additions' 
  },
    messages.map((m, i) => {
      const mine = m.sender_id === currentUserId;
      const pending = isPending(m.id);
      const isUnread = !mine && lastReadAt && new Date(m.created_at) > new Date(lastReadAt);
      const msgKey = String(m.id || `msg-${m.thread_id || 't'}-${m.created_at || 'ts'}-${i}`);
      
      return React.createElement('div', {
        key: msgKey,
        className: `flex ${mine ? 'justify-end' : 'justify-start'}`
      }, React.createElement('div', {
        className: `max-w-[75%]`
      }, [
        // sender label above bubble for non-mine messages
        !mine && React.createElement('div', { 
          key: 'sender-label', 
          className: 'text-xs mb-1 text-gray-500 px-1' 
        },
          identities[m.sender_id]?.name
          || identities[m.sender_id]?.display_name
          || (identities[m.sender_id]?.email ? prettyFromEmail(identities[m.sender_id]?.email) : null)
          || identities[m.sender_id]?.email
          || 'Unknown User'
        ),
        React.createElement('div', {
          key: 'bubble',
          className: `
            rounded-2xl px-4 py-2 shadow
            ${mine ? 'bg-indigo-600 text-white' : (isUnread ? 'bg-blue-50 border-2 border-blue-200 text-gray-900' : 'bg-gray-100 text-gray-900')}
            ${pending ? 'opacity-60' : ''}
          `
        }, [
          React.createElement('div', { 
            key: 'body', 
            className: 'whitespace-pre-wrap break-words' 
          }, renderInline(m.body)),
          React.createElement('div', { 
            key: 'meta', 
            className: `text-[11px] mt-1 ${mine ? 'text-indigo-100' : 'text-gray-500'} flex items-center gap-1` 
          }, [
            React.createElement('span', { 
              key: 'timestamp', 
              title: new Date(m.created_at).toISOString() 
            }, new Date(m.created_at).toLocaleString()),
            mine && React.createElement('span', {
              key: 'delivery-indicator',
              title: pending ? 'Sending…' : 'Delivered',
              className: pending ? 'text-indigo-200' : 'text-indigo-100'
            }, pending ? '⏳' : '✓'),
            isUnread && React.createElement('span', {
              key: 'unread-badge',
              className: 'text-blue-600 font-semibold text-xs',
              title: 'Unread message'
            }, 'NEW')
          ])
        ])
      ]));
    })
  );
}
window.MessageListV2 = MessageListV2;
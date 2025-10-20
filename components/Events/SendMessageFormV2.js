function SendMessageFormV2({ disabled, onSend }) {
  const [text, setText] = React.useState('');
  const canSend = !!text.trim() && !disabled;
  const textareaRef = React.useRef(null);

  const wrapSelection = (before, after=before) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0, end = ta.selectionEnd ?? 0;
    const selectedText = text.slice(start, end);
    const s = text.slice(0, start) + before + selectedText + after + text.slice(end);
    setText(s);
    
    // Restore selection inside wrapped text
    setTimeout(() => {
      try { 
        ta.focus({ preventScroll: true }); 
      } catch { 
        ta.focus(); 
      }
      if (selectedText) {
        ta.setSelectionRange(start + before.length, start + before.length + selectedText.length);
      } else {
        const pos = start + before.length;
        ta.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleKey = (e) => {
    const mod = e.metaKey || e.ctrlKey;
    
    // Send message shortcuts
    if ((e.key === 'Enter' && !e.shiftKey) || (mod && e.key === 'Enter')) {
      e.preventDefault();
      if (canSend) {
        const messageToSend = text;
        setText(''); // Clear immediately for instant feedback
        onSend(messageToSend).catch(() => {
          // If sending fails, restore the text
          setText(messageToSend);
        });
      }
      return;
    }
    
    // Formatting shortcuts
    if (mod) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          wrapSelection('**');
          break;
        case 'i':
          e.preventDefault();
          wrapSelection('*');
          break;
        case 'u':
          e.preventDefault();
          wrapSelection('__');
          break;
        default:
          break;
      }
    }
  };

  const handleSendClick = () => {
    if (canSend) {
      const messageToSend = text;
      setText(''); // Clear immediately for instant feedback
      onSend(messageToSend).catch(() => {
        // If sending fails, restore the text
        setText(messageToSend);
      });
    } else {
    }
  };

  return React.createElement('div', { className: 'border-t pt-3' }, [
    React.createElement('div', { key: 'toolbar', className: 'flex gap-1 pb-2' }, [
      React.createElement('button', { 
        key: 'bold', 
        type: 'button', 
        className: 'px-2 py-1 border rounded text-sm hover:bg-gray-50 transition-colors', 
        title: 'Bold (Ctrl+B)', 
        onClick: () => wrapSelection('**') 
      }, React.createElement('strong', { className: 'text-sm' }, 'B')),
      React.createElement('button', { 
        key: 'italic', 
        type: 'button', 
        className: 'px-2 py-1 border rounded text-sm hover:bg-gray-50 italic transition-colors', 
        title: 'Italic (Ctrl+I)', 
        onClick: () => wrapSelection('*') 
      }, React.createElement('span', { className: 'text-sm' }, 'I')),
      React.createElement('button', { 
        key: 'underline', 
        type: 'button', 
        className: 'px-2 py-1 border rounded text-sm hover:bg-gray-50 transition-colors', 
        title: 'Underline (Ctrl+U)', 
        onClick: () => wrapSelection('__') 
      }, React.createElement('span', { className: 'text-sm underline' }, 'U')),
    ]),
    React.createElement('div', { key: 'input-area', className: 'flex items-end gap-2' }, [
      React.createElement('textarea', {
        key: 'textarea',
        ref: textareaRef,
        rows: 2,
        'aria-label': 'Message input',
        'aria-multiline': 'true',
        value: text,
        onChange: (e) => setText(e.target.value),
        onKeyDown: handleKey,
        placeholder: 'Type something...',
        className: 'flex-1 resize-y min-h-[60px] max-h-[200px] p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500',
        title: 'Shift+Enter for newline • Enter or Ctrl/Cmd+Enter to send'
      }),
      React.createElement('button', {
        key: 'send-btn',
        onClick: handleSendClick,
        disabled: !canSend,
        'aria-disabled': !canSend,
        title: canSend ? 'Send (Enter or Ctrl/Cmd+Enter)' : 'Type a message to enable',
        className: `px-4 py-2 rounded-lg font-medium transition-colors ${
          canSend 
            ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
            : 'bg-gray-300 text-gray-600 cursor-not-allowed'
        }`
      }, 'Send')
    ])
  ]);
}
window.SendMessageFormV2 = SendMessageFormV2;
function Modal({ isOpen, onClose, title, children, size = 'md', fullScreen = false }) {
  try {
    if (!isOpen) return null;

    React.useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }, []);

    const sizeClasses = {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      '2xl': 'max-w-6xl',
      full: 'max-w-full'
    };

    const handleClose = (e) => {
      e.stopPropagation();
      onClose();
    };

    return React.createElement('div', {
      'data-name': 'modal-overlay',
      className: 'fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto',
      onClick: handleClose
    }, React.createElement('div', {
      className: 'min-h-screen px-4 text-center'
    }, React.createElement('div', {
      className: `inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all my-8 ${fullScreen ? 'w-full h-[90vh]' : sizeClasses[size]} ${fullScreen ? '' : 'mx-auto'}`,
      onClick: e => e.stopPropagation()
    }, [
      React.createElement('div', {
        key: 'header',
        className: 'bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between'
      }, [
        React.createElement('h3', {
          key: 'title',
          className: 'text-lg font-medium text-gray-900'
        }, title),
        React.createElement('button', {
          key: 'close',
          onClick: handleClose,
          className: 'text-gray-400 hover:text-gray-500 focus:outline-none'
        }, '×')
      ]),

      React.createElement('div', {
        key: 'content',
        className: `bg-white ${fullScreen ? 'h-[calc(90vh-4rem)]' : ''} overflow-y-auto`
      }, children)
    ])));
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.Modal = Modal;

// Expose modal control functions
window.showModal = (content) => {
  const event = new CustomEvent('showModal', { detail: { content } });
  window.dispatchEvent(event);
};

window.hideModal = () => {
  const event = new CustomEvent('hideModal');
  window.dispatchEvent(event);
};

// Expose modal control functions
window.showModal = (content) => {
  const event = new CustomEvent('showModal', { detail: { content } });
  window.dispatchEvent(event);
};

window.hideModal = () => {
  const event = new CustomEvent('hideModal');
  window.dispatchEvent(event);
};

function Toast({ message, type = 'info', onClose }) {
  try {
    React.useEffect(() => {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timer);
    }, [onClose]);

    const colors = {
      success: 'bg-green-50 border-green-200 text-green-600',
      error: 'bg-red-50 border-red-200 text-red-600',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-600',
      info: 'bg-blue-50 border-blue-200 text-blue-600'
    };

    return React.createElement('div', {
      'data-name': 'toast',
      className: `fixed top-4 right-4 p-4 rounded-lg border ${colors[type]} shadow-lg flex items-center space-x-3`,
      role: 'alert'
    }, [
      React.createElement('span', {
        key: 'icon',
        className: 'text-lg'
      }, type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'),
      React.createElement('p', {
        key: 'message'
      }, message),
      React.createElement('button', {
        key: 'close',
        onClick: onClose,
        className: 'ml-auto text-current opacity-50 hover:opacity-100',
        'aria-label': 'Close'
      }, '×')
    ]);
  } catch (error) {
    reportError(error);
    return null;
  }
}

function ToastContainer() {
  try {
    const [toasts, setToasts] = React.useState([]);

    React.useEffect(() => {
      const handleToast = (event) => {
        if (event.detail) {
          const { message, type, timestamp } = event.detail;
          const id = Date.now() + Math.random();
          setToasts(prev => [...prev, { id, message, type, timestamp: timestamp || Date.now() }]);
        }
      };

      window.addEventListener('toast', handleToast);
      return () => window.removeEventListener('toast', handleToast);
    }, []);

    return React.createElement('div', {
      'data-name': 'toast-container',
      className: 'fixed top-4 right-4 z-50 space-y-4'
    }, toasts.map(toast => React.createElement(Toast, {
      key: `toast-${toast.id}-${toast.timestamp || Date.now()}`,
      message: toast.message,
      type: toast.type,
      onClose: () => setToasts(prev => prev.filter(t => t.id !== toast.id))
    })));
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.showToast = (message, type = 'info') => {
  const event = new CustomEvent('toast', {
    detail: { message, type }
  });
  window.dispatchEvent(event);
};

window.Toast = Toast;
window.ToastContainer = ToastContainer;

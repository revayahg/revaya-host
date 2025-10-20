const toast = {
  show: (message, type = 'info', duration = 3000) => {
    // Ensure message is a string
    const displayMessage = typeof message === 'string' ? message : 
                          message && message.message ? message.message :
                          'An error occurred';
    
    // Remove any existing toasts
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());

    // Create toast element
    const toastElement = document.createElement('div');
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const id = `toast-${timestamp}-${randomId}`;
    
    toastElement.id = id;
    toastElement.className = `toast-notification fixed top-4 right-4 p-4 rounded-lg shadow-lg flex items-center space-x-3 z-50 ${
      type === 'error' ? 'bg-red-50 border border-red-200 text-red-600' : 
      type === 'success' ? 'bg-green-50 border border-green-200 text-green-600' :
      type === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-600' :
      'bg-blue-50 border border-blue-200 text-blue-600'
    }`;
    
    const icon = type === 'error' ? 'fa-exclamation-circle' : 
                 type === 'success' ? 'fa-check-circle' : 
                 type === 'warning' ? 'fa-exclamation-triangle' :
                 'fa-info-circle';
    
    toastElement.innerHTML = `
      <i class="fas ${icon}"></i>
      <span>${displayMessage}</span>
      <button onclick="document.getElementById('${id}').remove()" class="ml-4 text-current opacity-50 hover:opacity-100">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    document.body.appendChild(toastElement);
    
    // Auto-remove after duration
    setTimeout(() => {
      if (document.getElementById(id)) {
        document.getElementById(id).remove();
      }
    }, duration);
  },
  
  success: (message, duration = 3000) => {
    toast.show(message, 'success', duration);
  },
  
  error: (message, duration = 3000) => {
    toast.show(message, 'error', duration);
  },
  
  warning: (message, duration = 3000) => {
    toast.show(message, 'warning', duration);
  }
};

// Make toast available globally
window.toast = toast;

// Also provide showToast for compatibility with timestamp for unique keys
window.showToast = (message, type = 'info') => {
  const timestamp = Date.now();
  const event = new CustomEvent('toast', {
    detail: { message, type, timestamp }
  });
  window.dispatchEvent(event);
  toast.show(message, type);
};

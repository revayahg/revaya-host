class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    
    // Additional error logging for debugging
    if (error && error.message) {
    }
    
    if (error && error.stack) {
    }
    
    // Check if it's an auth-related error and attempt recovery
    if (error.message && (
        error.message.includes('Auth session') ||
        error.message.includes('No authenticated user') ||
        error.message.includes('Authentication required') ||
        error.message.includes('session missing')
    )) {
        try {
            // Clear auth state
            window.currentUser = null;
            if (window.clearSessionCache) {
                window.clearSessionCache();
            }
            // Try to sign out gracefully
            if (window.supabaseClient && window.supabaseClient.auth) {
                window.supabaseClient.auth.signOut().catch(signOutError => {
                });
            }
        } catch (recoveryError) {
        }
    }
    
    // Report to error tracking if available
    if (window.reportError && typeof window.reportError === 'function') {
      try {
        window.reportError(error);
      } catch (reportingError) {
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        className: 'min-h-screen flex items-center justify-center bg-gray-50'
      }, React.createElement('div', {
        className: 'text-center p-8'
      }, [
        React.createElement('div', {
          key: 'icon',
          className: 'text-6xl text-red-500 mb-4'
        }, '⚠️'),
        React.createElement('h1', {
          key: 'title',
          className: 'text-2xl font-bold text-gray-900 mb-2'
        }, 'Something went wrong'),
        React.createElement('p', {
          key: 'message',
          className: 'text-gray-600 mb-4'
        }, 'We encountered an unexpected error. Please refresh the page.'),
        React.createElement('button', {
          key: 'refresh',
          onClick: () => window.location.reload(),
          className: 'px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700'
        }, 'Refresh Page')
      ]));
    }

    return this.props.children;
  }
}

window.ErrorBoundary = ErrorBoundary;

// Feature flags
const VENDOR_SEARCH_ENABLED = false; // Set to true to re-enable vendor search

// Inner App component that uses auth hooks
function App() {
  // Call useAuth at the top level - no conditional checks before this
    const context = React.useContext(window.AuthContext || React.createContext({}));
    const { user, session, loading, authInitialized } = context;
  
  const [access, setAccess] = React.useState(
    localStorage.getItem('access_granted') === 'true'
  );
  const [currentRoute, setCurrentRoute] = React.useState(window.location.hash || '#');
  const [refreshKey, setRefreshKey] = React.useState(0);

  // All useEffect hooks must be called consistently on every render
  React.useEffect(() => {
    const handleHashChange = (e) => {
      try {
        let newHash = '';
        
        if (e && typeof e === 'object' && e.newURL && typeof e.newURL === 'string') {
          try {
            const urlParts = e.newURL.split('#');
            newHash = urlParts.length > 1 ? urlParts[1] : '';
          } catch (splitError) {
            console.warn('URL split error:', splitError);
            newHash = '';
          }
        } else {
          try {
            const currentHash = window.location.hash || '#';
            newHash = currentHash.replace(/^#/, '');
          } catch (locationError) {
            console.warn('Location access error:', locationError);
            newHash = '';
          }
        }
        
        const formattedRoute = '#' + (newHash || '');
        setCurrentRoute(formattedRoute);
        
      } catch (error) {
        console.error('Hash change error:', error);
        if (window.reportError) {
          window.reportError(error);
        }
        setCurrentRoute('#/');
      }
    };

    const handleNavigationRefresh = (event) => {
      if (event.detail && event.detail.forceRefresh) {
        setRefreshKey(prev => prev + 1);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('navigationRefresh', handleNavigationRefresh);
    
    return () => {
      try {
        window.removeEventListener('hashchange', handleHashChange);
        window.removeEventListener('navigationRefresh', handleNavigationRefresh);
      } catch (cleanupError) {
        console.error('Event listener cleanup error:', cleanupError);
      }
    };
  }, []);

  // Global hash change scroll to top
  React.useEffect(() => {
    const onHashChange = () => window.scrollTo(0, 0);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

        // Note: Removed premature redirect logic to prevent race conditions with auth initialization

  // Session-dependent effects - always called to maintain hook order
  React.useEffect(() => {
    if (session) {
      // Any session-dependent logic can go here
      console.log('Session available:', session.user?.email);
    }
  }, [session]);

  // Make vendor search feature flag globally accessible
  React.useEffect(() => {
    window.VENDOR_SEARCH_ENABLED = VENDOR_SEARCH_ENABLED;
  }, []);

    // Auth loading state - wait for both loading and initialization
    if (loading || !authInitialized) {
        return React.createElement('div', {
            className: 'min-h-screen flex items-center justify-center bg-gray-50'
        }, React.createElement('div', {
            className: 'text-center'
        }, [
            React.createElement('div', {
                key: 'spinner',
                className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4'
            }),
            React.createElement('p', {
                key: 'text',
                className: 'text-gray-600'
            }, 'Loading authentication system...')
        ]));
    }

    // Check if route requires auth and user is not authenticated
    const route = currentRoute.replace('#', '');
    const isProtectedRoute = (route) => {
        const protectedRoutes = [
            '/dashboard',
            '/settings',
            '/event-form',
            '/vendor-form',
            '/event/view/',
            '/event/edit/',
            '/vendor/view/',
            '/vendor/edit/',
            '/vendor-event/',
            '/knowledge'
        ];
        
        return protectedRoutes.some(protectedRoute => 
            route.startsWith(protectedRoute)
        );
    };

    // Show auth required UI for protected routes without authentication (but don't change hash)
    if (isProtectedRoute(route) && !user) {
        return React.createElement('div', {
            className: 'min-h-screen flex items-center justify-center bg-gray-50'
        }, React.createElement('div', {
            className: 'text-center max-w-md mx-auto p-6'
        }, [
            React.createElement('div', {
                key: 'icon',
                className: 'w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4'
            }, React.createElement('div', {
                className: 'icon-lock text-2xl text-indigo-600'
            })),
            React.createElement('h2', {
                key: 'title',
                className: 'text-xl font-semibold text-gray-900 mb-2'
            }, 'Authentication Required'),
            React.createElement('p', {
                key: 'description',
                className: 'text-gray-600 mb-6'
            }, 'Please sign in to access this page.'),
            React.createElement('button', {
                key: 'login-btn',
                onClick: () => {
                    sessionStorage.setItem('postLoginReturn', window.location.hash);
                    window.location.hash = '#/login';
                },
                className: 'inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors'
            }, 'Sign In')
        ]));
    }

  // Check access gate first
  if (!access) {
    try {
      if (window.AccessGate) {
        return React.createElement(window.AccessGate, {
          supabaseClient: window.supabaseClient,
          onSuccess: () => setAccess(true)
        });
      }
      return React.createElement('div', {
        className: 'min-h-screen flex items-center justify-center'
      }, React.createElement('p', {
        className: 'text-gray-600'
      }, 'Loading access gate...'));
    } catch (error) {
      console.error('Access gate error:', error);
      return null;
    }
  }

      const renderRoute = () => {
        try {
          const route = currentRoute.replace('#', '');
          
          // Special handling for password reset URLs with tokens
          if (route.includes('access_token') && route.includes('type=recovery')) {
            return window.ResetPassword ? React.createElement(window.ResetPassword) :
              React.createElement('div', { className: 'p-8' }, 'Loading reset password...');
          }

          // Handle reset-password route (from email links) - supports both direct and parameterized routes
          if (route === '/reset-password' || route.startsWith('/reset-password')) {
            return window.ResetPassword ? React.createElement(window.ResetPassword) :
              React.createElement('div', { className: 'p-8' }, 'Loading reset password...');
          }
          
          if (route === '' || route === '/') {
            return window.Homepage ? React.createElement(window.Homepage) : 
              React.createElement('div', { className: 'p-8' }, 'Loading homepage...');
          }
    
      if (route.startsWith('/invite/') || route.startsWith('/invite-response')) {
        return window.InviteResponse ? React.createElement(window.InviteResponse) :
          React.createElement('div', { className: 'p-8' }, 'Loading invite response...');
      }
      
      // Handle collaborator invitation responses with comprehensive URL matching
      if (route.startsWith('/collaborator-invite-response') || 
          route.startsWith('/collaborator-invite') ||
          route.includes('collaborator') && (route.includes('invite') || route.includes('invitation'))) {
        return window.CollaboratorInviteResponse ? React.createElement(window.CollaboratorInviteResponse) :
          React.createElement('div', { className: 'p-8' }, 'Loading collaborator invitation...');
      }
      
      // Handle task assignment responses
      if (route.startsWith('/task-response') || route.includes('task-response')) {
        return window.TaskAssignmentResponse ? React.createElement(window.TaskAssignmentResponse) :
          React.createElement('div', { className: 'p-8' }, 'Loading task assignment...');
      }
      
      if (route === '/invite/thank-you') {
        return window.ThankYou ? React.createElement(window.ThankYou) :
          React.createElement('div', { className: 'p-8' }, 'Loading thank you page...');
      }

      if (route === '/how-it-works') {
        return window.HowItWorks ? React.createElement(window.HowItWorks) :
          React.createElement('div', { className: 'p-8' }, 'Loading how it works...');
      }
      
      if (route === '/login' || route.startsWith('/login?')) {
        return window.Login ? React.createElement(window.Login) :
          React.createElement('div', { className: 'p-8' }, 'Loading login...');
      }
      
      if (route === '/signup' || route.startsWith('/signup?')) {
        // Check for invitation parameter first
        const urlParams = new URLSearchParams(window.location.search);
        const hasInvitation = urlParams.get('invitation');
        
        // Also check hash fragment for parameters
        const hash = window.location.hash;
        const queryStart = hash.indexOf('?');
        let hashParams = new URLSearchParams();
        if (queryStart !== -1) {
          hashParams = new URLSearchParams(hash.substring(queryStart + 1));
        }
        
        if (hasInvitation || hashParams.get('invitation')) {
          return window.SignupWithInvitation ? React.createElement(window.SignupWithInvitation) :
            React.createElement('div', { className: 'p-8' }, 'Loading signup...');
        }
        
        return window.Signup ? React.createElement(window.Signup) :
          React.createElement('div', { className: 'p-8' }, 'Loading signup...');
      }
      
      if (route === '/forgot-password') {
        return window.ForgotPassword ? React.createElement(window.ForgotPassword) :
          React.createElement('div', { className: 'p-8' }, 'Loading forgot password...');
      }
      
      if (route === '/reset-password' || route.startsWith('/reset-password')) {
        return window.ResetPassword ? React.createElement(window.ResetPassword) :
          React.createElement('div', { className: 'p-8' }, 'Loading reset password...');
      }
      
      if (route === '/privacy' || route === '/privacy-policy') {
        return window.PrivacyPolicy ? React.createElement(window.PrivacyPolicy) :
          React.createElement('div', { className: 'p-8' }, 'Loading privacy policy...');
      }
      
      if (route === '/terms' || route === '/terms-of-use') {
        return window.TermsOfUse ? React.createElement(window.TermsOfUse) :
          React.createElement('div', { className: 'p-8' }, 'Loading terms of use...');
      }
      
      if (route === '/unsubscribed' || route === 'unsubscribed') {
        return window.Unsubscribed ? React.createElement(window.Unsubscribed) :
          React.createElement('div', { className: 'p-8' }, 'Loading unsubscribed page...');
      }
      
      if (route === '/onboarding') {
        return window.OnboardingFlow ? React.createElement(window.OnboardingFlow) :
          React.createElement('div', { className: 'p-8' }, 'Loading onboarding...');
      }
      
      if (route === '/feedback') {
        return window.FeedbackPage ? React.createElement(window.FeedbackPage) :
          React.createElement('div', { className: 'p-8' }, 'Loading feedback...');
      }
      
      if (route === '/knowledge') {
        return window.KnowledgeBase ? React.createElement(window.KnowledgeBase) :
          React.createElement('div', { className: 'p-8' }, 'Loading knowledge base...');
      }
      
      if (route === '/messages' || route.startsWith('/messages')) {
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('event');
        return window.MessagesInboxV2 ? React.createElement(window.MessagesInboxV2, { 
          eventId,
          currentUser: user 
        }) : React.createElement('div', { className: 'p-8' }, 'Loading messages...');
      }
      
      if (route === '/settings' || route === '/dashboard/profile') {
        return window.ProfileSettings ? React.createElement(window.ProfileSettings) :
          React.createElement('div', { className: 'p-8' }, 'Loading profile settings...');
      }
      
      // Handle event view routes: /event/view/{id}
      if (route.startsWith('/event/view/')) {
        const eventId = route.replace('/event/view/', '');
        // Validate that eventId is not empty and not just "view"
        if (eventId && eventId !== 'view' && eventId.length > 0) {
          return window.ViewEventDetail ? React.createElement(window.ViewEventDetail, { eventId }) :
            React.createElement('div', { className: 'p-8' }, 'Loading event details...');
        } else {
          return React.createElement('div', { 
            className: 'container mx-auto px-4 py-8 text-center' 
          }, [
            React.createElement('h1', { 
              key: 'title',
              className: 'text-2xl font-bold mb-4' 
            }, 'Invalid Event URL'),
            React.createElement('p', { 
              key: 'desc',
              className: 'text-gray-600 mb-4' 
            }, 'Please provide a valid event ID in the URL.'),
            React.createElement('a', { 
              key: 'link',
              href: '#/dashboard', 
              className: 'text-indigo-600 hover:text-indigo-800' 
            }, 'Go back to dashboard')
          ]);
        }
      }
      
      // Handle event edit routes: /event/{id}/edit or /event/edit/{id}
      if (route.match(/^\/event\/[^/]+\/edit$/) || route.match(/^\/event\/edit\/[^/]+$/)) {
        let eventId;
        if (route.startsWith('/event/edit/')) {
          eventId = route.replace('/event/edit/', '');
        } else {
          const pathParts = route.split('/');
          eventId = pathParts[2]; // Get the ID part
        }
        
        // Validate that eventId is not empty and not just "edit"
        if (eventId && eventId !== 'edit' && eventId !== 'view' && eventId.length > 0) {
          if (window.EditEventForm) {
            return React.createElement(window.EditEventForm, { eventId });
          }
          return React.createElement('div', { 
            className: 'container mx-auto px-4 py-8' 
          }, React.createElement('p', {
            className: 'text-gray-600'
          }, 'Edit Event Form is loading...'));
        } else {
          return React.createElement('div', { 
            className: 'container mx-auto px-4 py-8 text-center' 
          }, [
            React.createElement('h1', { 
              key: 'title',
              className: 'text-2xl font-bold mb-4' 
            }, 'Invalid Event Edit URL'),
            React.createElement('p', { 
              key: 'desc',
              className: 'text-gray-600 mb-4' 
            }, 'Please provide a valid event ID in the URL.'),
            React.createElement('a', { 
              key: 'link',
              href: '#/dashboard', 
              className: 'text-indigo-600 hover:text-indigo-800' 
            }, 'Go back to dashboard')
          ]);
        }
      }
      
      // Handle vendor view routes: /vendor/view/{id}
      if (route.startsWith('/vendor/view/')) {
        const vendorId = route.replace('/vendor/view/', '');
        if (vendorId && vendorId !== 'view' && vendorId.length > 0) {
          return window.ViewVendorProfile ? React.createElement(window.ViewVendorProfile, { vendorId }) :
            React.createElement('div', { className: 'p-8' }, 'Loading vendor profile...');
        } else {
          return React.createElement('div', { 
            className: 'container mx-auto px-4 py-8 text-center' 
          }, [
            React.createElement('h1', { 
              key: 'title',
              className: 'text-2xl font-bold mb-4' 
            }, 'Invalid Vendor URL'),
            React.createElement('p', { 
              key: 'desc',
              className: 'text-gray-600 mb-4' 
            }, 'Please provide a valid vendor ID in the URL.'),
            React.createElement('a', { 
              key: 'link',
              href: '#/dashboard', 
              className: 'text-indigo-600 hover:text-indigo-800' 
            }, 'Go back to dashboard')
          ]);
        }
      }
      
      // Handle vendor edit routes: /vendor/edit/{id}
      if (route.startsWith('/vendor/edit/')) {
        const vendorId = route.replace('/vendor/edit/', '');
        if (vendorId && vendorId !== 'edit' && vendorId !== 'view' && vendorId.length > 0) {
          return window.EditVendorProfileForm ? React.createElement(window.EditVendorProfileForm, { vendorId }) :
            React.createElement('div', { className: 'p-8' }, 'Loading vendor edit form...');
        } else {
          return React.createElement('div', { 
            className: 'container mx-auto px-4 py-8 text-center' 
          }, [
            React.createElement('h1', { 
              key: 'title',
              className: 'text-2xl font-bold mb-4' 
            }, 'Invalid Vendor Edit URL'),
            React.createElement('p', { 
              key: 'desc',
              className: 'text-gray-600 mb-4' 
            }, 'Please provide a valid vendor ID in the URL.'),
            React.createElement('a', { 
              key: 'link',
              href: '#/dashboard', 
              className: 'text-indigo-600 hover:text-indigo-800' 
            }, 'Go back to dashboard')
          ]);
        }
      }
      
      // Handle vendor event view: /vendor-event/{eventId}
      if (route.startsWith('/vendor-event/')) {
        const eventId = route.replace('/vendor-event/', '').split('?')[0];
        if (eventId && eventId.length > 0) {
          return window.VendorEventView ? React.createElement(window.VendorEventView, { eventId }) :
            React.createElement('div', { className: 'p-8' }, 'Loading vendor event view...');
        } else {
          return React.createElement('div', { 
            className: 'container mx-auto px-4 py-8 text-center' 
          }, [
            React.createElement('h1', { 
              key: 'title',
              className: 'text-2xl font-bold mb-4' 
            }, 'Invalid Vendor Event URL'),
            React.createElement('p', { 
              key: 'desc',
              className: 'text-gray-600 mb-4' 
            }, 'Please provide a valid event ID in the URL.'),
            React.createElement('a', { 
              key: 'link',
              href: '#/dashboard', 
              className: 'text-indigo-600 hover:text-indigo-800' 
            }, 'Go back to dashboard')
          ]);
        }
      }
      
      if (route.startsWith('/dashboard')) {
        return window.Dashboard ? React.createElement(window.Dashboard, { route, key: refreshKey }) :
          React.createElement('div', { className: 'p-8' }, 'Loading dashboard...');
      }
      
      if (route === '/search-vendors') {
        if (!VENDOR_SEARCH_ENABLED) {
          return React.createElement('div', {
            className: 'min-h-screen bg-gray-50 flex items-center justify-center'
          }, React.createElement('div', {
            className: 'text-center p-8 max-w-md mx-auto'
          }, [
            React.createElement('div', {
              key: 'icon',
              className: 'icon-construction text-6xl text-gray-400 mb-4'
            }),
            React.createElement('h2', {
              key: 'title',
              className: 'text-2xl font-bold text-gray-900 mb-2'
            }, 'Vendor Search Coming Soon'),
            React.createElement('p', {
              key: 'description',
              className: 'text-gray-600 mb-6'
            }, 'We\'re working on bringing you an amazing vendor search experience. Stay tuned!'),
            React.createElement('a', {
              key: 'back-btn',
              href: '#/',
              className: 'inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors'
            }, 'Back to Home')
          ]));
        }
        return window.VendorSearchPage ? React.createElement(window.VendorSearchPage) :
          React.createElement('div', { className: 'p-8' }, 'Loading vendor search...');
      }
      
      if (route === '/mock-event') {
        return window.MockEventPage ? React.createElement(window.MockEventPage) :
          React.createElement('div', { className: 'p-8' }, 'Loading mock event...');
      }
      
      if (route === '/mock-vendor') {
        return window.MockVendorPage ? React.createElement(window.MockVendorPage) :
          React.createElement('div', { className: 'p-8' }, 'Loading mock vendor...');
      }
      
      // Alias: support /create-event for backwards compatibility
      if (route === '/create-event') {
        return window.CreateEventForm ? React.createElement(window.CreateEventForm) :
          React.createElement('div', { className: 'p-8' }, 'Loading event form...');
      }
      
      // Handle event form routes
      if (route === '/event-form') {
        return window.CreateEventForm ? React.createElement(window.CreateEventForm) :
          React.createElement('div', { className: 'p-8' }, 'Loading event form...');
      }
      
      // Handle vendor form routes
      if (route === '/vendor-form') {
        return window.CreateVendorProfileForm ? React.createElement(window.CreateVendorProfileForm) :
          React.createElement('div', { className: 'p-8' }, 'Loading vendor form...');
      }
      
      return React.createElement('div', { 
        className: 'container mx-auto px-4 py-8 text-center' 
      }, [
        React.createElement('h1', { 
          key: 'title',
          className: 'text-2xl font-bold mb-4' 
        }, '404 - Page Not Found'),
        React.createElement('p', { 
          key: 'desc',
          className: 'text-gray-600 mb-4' 
        }, `The page "${route}" does not exist.`),
        React.createElement('a', { 
          key: 'link',
          href: '#', 
          className: 'text-indigo-600 hover:text-indigo-800' 
        }, 'Go back to home')
      ]);
    } catch (error) {
      console.error('Route rendering error (handled gracefully):', error.message || error);
      if (window.reportError) {
        window.reportError(error);
      }
      return React.createElement('div', {
        className: 'container mx-auto px-4 py-8 text-center'
      }, [
        React.createElement('h1', {
          key: 'error-title',
          className: 'text-2xl font-bold mb-4 text-red-600'
        }, 'Page Loading Error'),
        React.createElement('p', {
          key: 'error-desc',
          className: 'text-gray-600 mb-4'
        }, 'An error occurred while loading the page. This has been reported and we\'re working to fix it.'),
        React.createElement('div', {
          key: 'error-actions',
          className: 'space-x-4'
        }, [
          React.createElement('button', {
            key: 'retry-btn',
            onClick: () => window.location.reload(),
            className: 'px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700'
          }, 'Refresh Page'),
          React.createElement('a', {
            key: 'home-btn',
            href: '#/',
            className: 'px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 inline-block'
          }, 'Go Home')
        ])
      ]);
    }
  };

  try {
    return React.createElement(
      window.Layout,
      null,
      renderRoute(),
      window.DebugConsole ? React.createElement(window.DebugConsole) : null
    );
  } catch (error) {
    console.error('App render error:', error);
    return React.createElement('div', {
      className: 'min-h-screen flex items-center justify-center bg-red-50'
    }, React.createElement('div', {
      className: 'text-center'
    }, [
      React.createElement('h1', {
        key: 'title',
        className: 'text-xl font-bold text-red-600 mb-2'
      }, 'Application Error'),
      React.createElement('p', {
        key: 'message',
        className: 'text-red-500'
      }, 'Please refresh the page to try again.')
    ]));
  }
}

// App shell component that wraps everything with providers
function AppShell() {
  const [componentsLoaded, setComponentsLoaded] = React.useState(false);
  const [authReady, setAuthReady] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    // Wait for essential components to be loaded
    const checkComponents = () => {
      try {
        const requiredComponents = [
          'ErrorBoundary', 
          'AuthProvider', 
          'Layout'
        ];
        
        const allLoaded = requiredComponents.every(comp => 
          window[comp] && typeof window[comp] === 'function'
        );
        
        if (allLoaded) {
          setComponentsLoaded(true);
        } else {
          setTimeout(checkComponents, 100);
        }
      } catch (error) {
        console.error('Component loading error:', error);
        setError('Failed to load application components');
      }
    };
    checkComponents();
  }, []);

  // Check if auth system is ready
  React.useEffect(() => {
    let attempts = 0;
    const maxAttempts = 100;
    
    const checkAuthReady = () => {
      attempts++;
      try {
        if (window.AuthProvider && 
            window.ErrorBoundary && 
            window.supabaseClient && 
            window.getCurrentSession &&
            window.getSessionWithRetry &&
            window.validateSession &&
            window.getSessionSafe &&
            window.isAuthenticated &&
            window.getUser) {
          setAuthReady(true);
          console.log('Auth system ready after', attempts, 'attempts');
        } else if (attempts < maxAttempts) {
          setTimeout(checkAuthReady, 100);
        } else {
          console.warn('Auth system not fully ready after max attempts - proceeding with fallback');
          setAuthReady(true);
        }
      } catch (error) {
        console.warn('Error during auth system check (handled gracefully):', error.message || error);
        if (attempts >= maxAttempts) {
          setAuthReady(true);
        } else {
          setTimeout(checkAuthReady, 100);
        }
      }
    };
    checkAuthReady();
  }, []);

  // Show error state if there's an error
  if (error) {
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
      }, 'Application Error'),
      React.createElement('p', {
        key: 'message',
        className: 'text-gray-600 mb-4'
      }, error),
      React.createElement('button', {
        key: 'retry',
        onClick: () => {
          setError(null);
          setComponentsLoaded(false);
          window.location.reload();
        },
        className: 'px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700'
      }, 'Retry')
    ]));
  }

  // Show loading while components are being initialized
  if (!componentsLoaded || !authReady) {
    return React.createElement('div', {
      className: 'min-h-screen flex items-center justify-center bg-gray-50'
    }, React.createElement('div', {
      className: 'text-center max-w-md mx-auto p-6'
    }, [
      React.createElement('div', {
        key: 'spinner',
        className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4'
      }),
      React.createElement('p', {
        key: 'text',
        className: 'text-gray-600 mb-2'
      }, !authReady ? 'Initializing authentication system...' : 'Loading application...'),
      React.createElement('p', {
        key: 'note',
        className: 'text-sm text-gray-500'
      }, 'If this takes longer than expected, try refreshing the page')
    ]));
  }

  try {
    // Ensure required components are available before rendering
    if (!window.AuthProvider || !window.ErrorBoundary || !window.supabaseClient) {
      return React.createElement('div', {
        className: 'min-h-screen flex items-center justify-center bg-gray-50'
      }, React.createElement('div', {
        className: 'text-center'
      }, [
        React.createElement('div', {
          key: 'spinner',
          className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4'
        }),
        React.createElement('p', {
          key: 'text',
          className: 'text-gray-600'
        }, window.supabaseClient ? 'Initializing authentication...' : 'Connecting to services...')
      ]));
    }

    return React.createElement(
      window.ErrorBoundary,
      null,
      React.createElement(
        window.AuthProvider,
        null,
        React.createElement(App)
      ),
      window.ToastContainer ? React.createElement(window.ToastContainer) : null
    );

  } catch (error) {
    console.error('AppShell render error:', error);
    return React.createElement('div', {
      className: 'min-h-screen flex items-center justify-center bg-red-50'
    }, React.createElement('div', {
      className: 'text-center'
    }, [
      React.createElement('h1', {
        key: 'title',
        className: 'text-xl font-bold text-red-600 mb-2'
      }, 'Application Error'),
      React.createElement('p', {
        key: 'message',
        className: 'text-red-500'
      }, 'Please refresh the page to try again.')
    ]));
  }
}

// Global test functions for debugging
window.testCollaboratorAPI = function() {
    console.log('=== GLOBAL TEST FUNCTION ===');
    if (window.collaboratorAPI?.testAPI) {
        return window.collaboratorAPI.testAPI();
    } else {
        console.error('❌ collaboratorAPI not available');
        return { success: false, error: 'collaboratorAPI not loaded' };
    }
};

window.debugInvitation = function(token) {
    console.log('=== DEBUG INVITATION TOKEN ===');
    console.log('Token provided:', token);
    if (window.collaboratorAPI?.acceptInvitationByToken) {
        console.log('✓ acceptInvitationByToken function available');
        return window.collaboratorAPI.acceptInvitationByToken(token);
    } else {
        console.error('❌ acceptInvitationByToken not available');
        return { success: false, error: 'Function not available' };
    }
};

// Initialize Messaging V2 once supabase is ready
setTimeout(() => {
  try { window.messageAPIv2?.init({ supabase: window.supabaseClient }); } catch {}
}, 0);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(AppShell));

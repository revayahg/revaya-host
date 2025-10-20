function Layout({ children }) {
  try {
    
    // Add auth loading guard
    const authContext = window.useAuth?.() || {};
    const { user: authUser, session, loading: authLoading } = authContext;
    
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [currentUser, setCurrentUser] = React.useState(authUser);
    const [isLoading, setIsLoading] = React.useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);
    const [modalContent, setModalContent] = React.useState(null);
    
    if (authLoading) {
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
        }, 'Loading authentication...')
      ]));
    }

    React.useEffect(() => {
      // Use auth context directly instead of duplicate auth logic
      setCurrentUser(authUser);
    }, [authUser]);

    React.useEffect(() => {
      // Modal event listeners
      const handleShowModal = (event) => {
        setModalContent(event.detail.content);
      };

      const handleHideModal = () => {
        setModalContent(null);
      };

      window.addEventListener('showModal', handleShowModal);
      window.addEventListener('hideModal', handleHideModal);

      return () => {
        window.removeEventListener('showModal', handleShowModal);
        window.removeEventListener('hideModal', handleHideModal);
      };
    }, []);

    const handleLogout = async () => {
      try {
        window.Environment?.devLog('Layout: Starting logout...');
        setProfileMenuOpen(false);
        
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) throw error;

        // Clear local storage
        localStorage.clear();
        
        window.Environment?.devLog('Layout: Logout successful, redirecting...');
        
        // Show success message if available
        if (window.toast?.success) {
          window.toast.success('Signed out successfully');
        }

        // Redirect to home page
        window.location.hash = '#/';
        
        // Force reload to ensure clean state
        setTimeout(() => {
          window.location.reload();
        }, 100);

      } catch (error) {
        if (window.toast?.error) {
          window.toast.error('Error signing out: ' + error.message);
        }
        reportError(error);
      }
    };

    const handleNavigation = (e, route) => {
      try {
        const currentHash = window.location.hash || '#/';
        
        
        if (e && typeof e.preventDefault === 'function') {
          e.preventDefault();
        }
        
        // If clicking the same page (dashboard), force a refresh
        if (currentHash === route && route === '#/dashboard') {
          // Dispatch custom event for refresh
          window.dispatchEvent(new CustomEvent('navigationRefresh', {
            detail: { forceRefresh: true, targetHash: route }
          }));
        } else {
          if (route) {
            window.location.hash = route;
          }
        }
        
        setIsMenuOpen(false);
        setProfileMenuOpen(false);
      } catch (error) {
        // Fallback navigation
        try {
          if (route) {
            window.location.href = route;
          }
        } catch (fallbackError) {
        }
      }
    };

    return (
      <div data-name="layout" className="min-h-screen flex flex-col">
        <header data-name="header" className="bg-white border-b border-gray-200 fixed w-full top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <a 
                href="#" 
                className="flex items-center space-x-2" 
                data-name="logo"
                onClick={(e) => handleNavigation(e, '#')}
              >
                <img 
                  src="https://app.trickle.so/storage/public/images/usr_0ad8d73270000001/b82fcc53-1a5b-4af3-8977-6ba017cf0c53.png" 
                  alt="Revaya Host" 
                  className="h-8 w-auto"
                />
                <span className="text-xl font-bold text-gray-900">Revaya Host</span>
              </a>

              <nav className="hidden md:flex items-center space-x-4">
                {window.VENDOR_SEARCH_ENABLED !== false && (
                  <a
                    href="#/search-vendors"
                    className="px-3 py-2 text-gray-600 hover:text-indigo-600 transition-colors"
                    data-name="nav-vendors"
                    onClick={(e) => handleNavigation(e, '#/search-vendors')}
                  >
                    Find Vendors
                  </a>
                )}
                {currentUser && (
                  <a
                    href="#/feedback"
                    className="px-3 py-2 text-gray-600 hover:text-indigo-600 transition-colors"
                    data-name="nav-feedback"
                    onClick={(e) => handleNavigation(e, '#/feedback')}
                  >
                    Feedback
                  </a>
                )}
                {currentUser ? (
                  <>
                    <button
                      className="px-3 py-2 text-gray-600 hover:text-indigo-600 transition-colors"
                      data-name="nav-dashboard"
                      id="layout-dashboard-button"
                      onClick={(e) => handleNavigation(e, '#/dashboard')}
                    >
                      Dashboard
                    </button>
                    <div className="relative" data-name="profile-menu">
                      <button
                        onClick={() => {
                          window.Environment?.devLog('Profile menu clicked, current state:', profileMenuOpen);
                          setProfileMenuOpen(!profileMenuOpen);
                        }}
                        className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-indigo-600 transition-colors"
                      >
                        <span>{currentUser.email}</span>
                        <i className={`fas fa-chevron-${profileMenuOpen ? 'up' : 'down'} text-xs`}></i>
                      </button>
                      {profileMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 border border-gray-200">
                          <a
                            href="#/dashboard/profile"
                            className="block px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
                            onClick={(e) => handleNavigation(e, '#/dashboard/profile')}
                          >
                            <i className="fas fa-user-circle mr-2"></i>
                            Profile Settings
                          </a>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              window.Environment?.devLog('Sign out button clicked');
                              handleLogout();
                            }}
                            className="w-full text-left px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <i className="fas fa-sign-out-alt mr-2"></i>
                            Sign Out
                          </button>
                          <window.FeedbackWidget />
        

      </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <a
                      href="#/login"
                      className="px-4 py-2 text-gray-600 hover:text-indigo-600 transition-colors"
                      data-name="nav-login"
                      onClick={(e) => handleNavigation(e, '#/login')}
                    >
                      Sign In
                    </a>
                    <a
                      href="#/signup"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      data-name="nav-signup"
                      onClick={(e) => handleNavigation(e, '#/signup')}
                    >
                      Sign Up
                    </a>
                  </>
                )}
              </nav>

              <button
                className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                data-name="mobile-menu-button"
              >
                <i className={`fas fa-${isMenuOpen ? 'times' : 'bars'}`}></i>
              </button>
            </div>

            {isMenuOpen && (
              <div className="md:hidden py-4 border-t border-gray-200" data-name="mobile-menu">
                {window.VENDOR_SEARCH_ENABLED !== false && (
                  <a
                    href="#/search-vendors"
                    className="block px-4 py-2 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                    onClick={(e) => handleNavigation(e, '#/search-vendors')}
                  >
                    Find Vendors
                  </a>
                )}
                {currentUser && (
                  <a
                    href="#/feedback"
                    className="block px-4 py-2 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                    onClick={(e) => handleNavigation(e, '#/feedback')}
                  >
                    Feedback
                  </a>
                )}
                {currentUser ? (
                  <>
                  <button
                    className="block w-full text-left px-4 py-2 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                    onClick={(e) => {
                      handleNavigation(e, '#/dashboard');
                    }}
                  >
                    Dashboard
                  </button>
                    <a
                      href="#/dashboard/profile"
                      className="block px-4 py-2 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                      onClick={(e) => handleNavigation(e, '#/dashboard/profile')}
                    >
                      Profile Settings
                    </a>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        window.Environment?.devLog('Mobile sign out button clicked');
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <a
                      href="#/login"
                      className="block px-4 py-2 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                      onClick={(e) => handleNavigation(e, '#/login')}
                    >
                      Sign In
                    </a>
                    <a
                      href="#/signup"
                      className="block px-4 py-2 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                      onClick={(e) => handleNavigation(e, '#/signup')}
                    >
                      Sign Up
                    </a>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        <main data-name="main-content" className="flex-grow pt-16 mobile-content-padding">
          {children}
        </main>
        
        {/* Mobile Bottom Navigation */}
        {currentUser && (
          <div className="mobile-bottom-nav md:hidden">
            <div className="flex justify-around items-center">
              <button
                className={`mobile-nav-item ${window.location.hash === '#/dashboard' ? 'active' : ''}`}
                onClick={(e) => {
                  handleNavigation(e, '#/dashboard');
                }}
              >
                <div className="icon-home text-lg mb-1"></div>
                <span>Home</span>
              </button>
              <a
                href="#/event-form"
                className="mobile-nav-item"
                onClick={(e) => handleNavigation(e, '#/event-form')}
              >
                <div className="icon-plus text-lg mb-1"></div>
                <span>Create</span>
              </a>
              <a
                href="#/notifications"
                className={`mobile-nav-item ${window.location.hash === '#/notifications' ? 'active' : ''}`}
                onClick={(e) => handleNavigation(e, '#/notifications')}
              >
                <div className="icon-bell text-lg mb-1"></div>
                <span>Alerts</span>
              </a>
              <a
                href="#/dashboard/profile"
                className={`mobile-nav-item ${window.location.hash === '#/dashboard/profile' ? 'active' : ''}`}
                onClick={(e) => handleNavigation(e, '#/dashboard/profile')}
              >
                <div className="icon-user text-lg mb-1"></div>
                <span>Profile</span>
              </a>
            </div>
          </div>
        )}

        {/* Modal Container */}
        {modalContent && React.createElement(window.Modal, {
          isOpen: true,
          onClose: () => setModalContent(null),
          children: modalContent
        })}

      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.Layout = Layout;

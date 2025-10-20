function Navigation({ user }) {
    const [currentRoute, setCurrentRoute] = React.useState(window.location.hash);
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    React.useEffect(() => {
        const handleHashChange = () => {
            setCurrentRoute(window.location.hash);
            setMobileMenuOpen(false); // Close mobile menu on navigation
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const isActive = (path) => {
        return currentRoute === `#${path}` || currentRoute.startsWith(`#${path}/`);
    };

    const handleSignOut = async () => {
        try {
            await window.supabaseClient.auth.signOut();
            window.location.hash = '#/';
            window.location.reload();
        } catch (error) {
        }
    };

    const handleNavClick = (targetHash, event) => {
        const currentHash = window.location.hash || '#/';
        
        // If clicking the same page, force a refresh
        if (currentHash === targetHash) {
            event.preventDefault();
            event.stopPropagation();
            
            // Dispatch custom event for refresh
            window.dispatchEvent(new CustomEvent('navigationRefresh', {
                detail: { forceRefresh: true, targetHash }
            }));
            return false;
        } else {
            // Navigate to the target hash
            window.location.hash = targetHash;
        }
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    return React.createElement('nav', { className: 'bg-white border-b border-gray-200 relative' }, [
        React.createElement('div', { key: 'nav-content', className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' }, [
            React.createElement('div', { key: 'nav-inner', className: 'flex justify-between h-16' }, [
                React.createElement('div', { key: 'left-section', className: 'flex items-center space-x-8' }, [
                    React.createElement('a', { 
                        key: 'logo', 
                        href: '#/', 
                        className: 'text-xl font-bold text-indigo-600 touch-target' 
                    }, 'Revaya Host'),
                    
                    // Desktop navigation
                    user && React.createElement('div', { key: 'nav-links', className: 'hidden md:flex space-x-6' }, [
                        React.createElement('button', {
                            key: 'dashboard',
                            'data-nav': true,
                            onClick: (e) => {
                                handleNavClick('#/dashboard', e);
                            },
                            className: `px-3 py-2 text-sm font-medium transition-colors touch-target ${
                                isActive('/dashboard') 
                                    ? 'text-indigo-600 border-b-2 border-indigo-600' 
                                    : 'text-gray-700 hover:text-indigo-600'
                            }`
                        }, 'Dashboard'),
                        React.createElement('a', {
                            key: 'messages',
                            href: '#/messages',
                            'data-nav': true,
                            className: `px-3 py-2 text-sm font-medium transition-colors touch-target ${
                                isActive('/messages') 
                                    ? 'text-indigo-600 border-b-2 border-indigo-600' 
                                    : 'text-gray-700 hover:text-indigo-600'
                            }`
                        }, 'Messages'),
                        React.createElement('a', {
                            key: 'knowledge',
                            href: '#/knowledge',
                            'data-nav': true,
                            className: `px-3 py-2 text-sm font-medium transition-colors touch-target ${
                                isActive('/knowledge') 
                                    ? 'text-indigo-600 border-b-2 border-indigo-600' 
                                    : 'text-gray-700 hover:text-indigo-600'
                            }`
                        }, 'Knowledge')
                    ])
                ]),
                
                React.createElement('div', { key: 'right-section', className: 'flex items-center space-x-2 md:space-x-4' }, [
                    // Desktop user menu
                    ...user ? [
                        React.createElement('span', { 
                            key: 'user-email', 
                            className: 'hidden sm:block text-sm text-gray-700 truncate max-w-32' 
                        }, user.email),
                        React.createElement('button', {
                            key: 'profile-btn',
                            onClick: () => window.location.hash = '#/settings',
                            className: 'hidden md:block text-gray-700 hover:text-indigo-600 transition-colors touch-target'
                        }, 'Profile'),
                        React.createElement('button', {
                            key: 'signout-btn',
                            onClick: handleSignOut,
                            className: 'hidden md:block text-gray-700 hover:text-red-600 transition-colors touch-target'
                        }, 'Sign Out')
                    ] : [
                        React.createElement('a', {
                            key: 'login-link',
                            href: '#/login',
                            className: 'hidden sm:block text-gray-700 hover:text-indigo-600 transition-colors touch-target'
                        }, 'Login'),
                        React.createElement('a', {
                            key: 'signup-link',
                            href: '#/signup',
                            className: 'hidden sm:block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors touch-target'
                        }, 'Sign Up')
                    ],
                    
                    // Mobile hamburger menu
                    user && React.createElement('button', {
                        key: 'mobile-menu-btn',
                        onClick: toggleMobileMenu,
                        className: 'md:hidden p-2 rounded-md text-gray-700 hover:text-indigo-600 hover:bg-gray-100 touch-target'
                    }, React.createElement('div', {
                        className: 'w-6 h-6 flex flex-col justify-center space-y-1'
                    }, [
                        React.createElement('div', { key: 'line1', className: 'w-full h-0.5 bg-current' }),
                        React.createElement('div', { key: 'line2', className: 'w-full h-0.5 bg-current' }),
                        React.createElement('div', { key: 'line3', className: 'w-full h-0.5 bg-current' })
                    ]))
                ])
            ])
        ]),
        
        // Mobile menu overlay and sidebar
        mobileMenuOpen && React.createElement('div', {
            key: 'mobile-overlay',
            className: 'md:hidden fixed inset-0 z-50',
            onClick: () => setMobileMenuOpen(false)
        }, [
            React.createElement('div', { 
                key: 'overlay-bg', 
                className: 'absolute inset-0 bg-black bg-opacity-50' 
            }),
            React.createElement('div', {
                key: 'mobile-menu',
                className: 'absolute top-0 right-0 h-full w-64 bg-white shadow-lg',
                onClick: (e) => e.stopPropagation()
            }, [
                React.createElement('div', {
                    key: 'menu-header',
                    className: 'p-4 border-b border-gray-200 flex justify-between items-center'
                }, [
                    React.createElement('span', { key: 'menu-title', className: 'text-lg font-semibold' }, 'Menu'),
                    React.createElement('button', {
                        key: 'close-btn',
                        onClick: () => setMobileMenuOpen(false),
                        className: 'p-2 rounded-md text-gray-500 hover:text-gray-700 touch-target'
                    }, '✕')
                ]),
                React.createElement('div', { key: 'menu-content', className: 'p-4 space-y-4' }, [
                    React.createElement('div', { key: 'user-info', className: 'pb-4 border-b border-gray-200' }, [
                        React.createElement('div', { className: 'text-sm text-gray-500' }, 'Signed in as'),
                        React.createElement('div', { className: 'font-medium truncate' }, user?.email)
                    ]),
                    React.createElement('nav', { key: 'mobile-nav', className: 'space-y-2' }, [
                        React.createElement('button', {
                            key: 'mob-dashboard',
                            'data-nav': true,
                            onClick: (e) => {
                                handleNavClick('#/dashboard', e);
                            },
                            className: `block w-full text-left px-3 py-3 text-base font-medium transition-colors touch-target ${
                                isActive('/dashboard') 
                                    ? 'text-indigo-600 bg-indigo-50 border-l-4 border-indigo-600' 
                                    : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                            }`
                        }, 'Dashboard'),
                        React.createElement('a', {
                            key: 'mob-messages',
                            href: '#/messages',
                            'data-nav': true,
                            className: `block px-3 py-3 text-base font-medium transition-colors touch-target ${
                                isActive('/messages') 
                                    ? 'text-indigo-600 bg-indigo-50 border-l-4 border-indigo-600' 
                                    : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                            }`
                        }, 'Messages'),
                        React.createElement('a', {
                            key: 'mob-knowledge',
                            href: '#/knowledge',
                            'data-nav': true,
                            className: `block px-3 py-3 text-base font-medium transition-colors touch-target ${
                                isActive('/knowledge') 
                                    ? 'text-indigo-600 bg-indigo-50 border-l-4 border-indigo-600' 
                                    : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                            }`
                        }, 'Knowledge'),
                        React.createElement('a', {
                            key: 'mob-privacy',
                            href: '#/privacy',
                            'data-nav': true,
                            className: `block px-3 py-3 text-base font-medium transition-colors touch-target ${
                                isActive('/privacy') 
                                    ? 'text-indigo-600 bg-indigo-50 border-l-4 border-indigo-600' 
                                    : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                            }`
                        }, 'Privacy')
                    ]),
                    React.createElement('div', { key: 'mobile-actions', className: 'pt-4 border-t border-gray-200 space-y-2' }, [
                        React.createElement('button', {
                            key: 'mob-profile',
                            onClick: () => window.location.hash = '#/settings',
                            className: 'block w-full text-left px-3 py-3 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 transition-colors touch-target'
                        }, 'Profile Settings'),
                        React.createElement('button', {
                            key: 'mob-signout',
                            onClick: handleSignOut,
                            className: 'block w-full text-left px-3 py-3 text-base font-medium text-red-600 hover:bg-red-50 transition-colors touch-target'
                        }, 'Sign Out')
                    ])
                ])
            ])
        ])
    ]);
}

window.Navigation = Navigation;
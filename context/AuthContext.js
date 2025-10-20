// AuthContext.js
const AuthContext = React.createContext(null);

function AuthProvider({ children }) {
    const [user, setUser] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [session, setSession] = React.useState(null);
    const [authInitialized, setAuthInitialized] = React.useState(false);

    React.useEffect(() => {
        let mounted = true;
        let authSubscription = null;

        const initAuth = async () => {
            if (!window.supabaseClient?.auth) {
                console.error('Supabase client not initialized');
                setLoading(false);
                return;
            }

            try {
                console.log('🔐 Initializing auth system...');

                // Wait for Supabase client to be fully ready
                let attempts = 0;
                while (!window.supabaseClient.auth.getSession && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }

                // Get initial session from Supabase
                const { data: { session: initialSession }, error } = await window.supabaseClient.auth.getSession();
                
                if (error) {
                    console.warn('Initial session error (handled gracefully):', error.message);
                } else if (initialSession?.user) {
                    console.log('✅ Found existing session:', initialSession.user.email);
                    setUser(initialSession.user);
                    setSession(initialSession);
                    
                    // Save to localStorage
                    if (window.saveSessionToStorage) {
                        window.saveSessionToStorage(initialSession);
                    }
                } else {
                    console.log('ℹ️ No existing session found');
                }

                // Mark auth as initialized after initial session check
                setAuthInitialized(true);

                // Set up auth state change listener
                authSubscription = window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
                    if (!mounted) return;

                    console.log('🔄 Auth state change:', event, session?.user?.email || 'no user');

                    try {
                        switch (event) {
                            case 'SIGNED_IN':
                                if (session?.user) {
                                    setUser(session.user);
                                    setSession(session);
                                    
                                    // Save session to storage
                                    if (window.saveSessionToStorage) {
                                        window.saveSessionToStorage(session);
                                    }

                                    // Handle post-login flows
                                    await handlePostLoginFlow(session);
                                }
                                break;

                            case 'SIGNED_OUT':
                                setUser(null);
                                setSession(null);
                                
                                // Clear session cache
                                if (window.clearSessionCache) {
                                    window.clearSessionCache();
                                }
                                
                                // Redirect to home if on protected route
                                redirectToLoginIfNeeded();
                                break;

                            case 'TOKEN_REFRESHED':
                                if (session?.user) {
                                    setUser(session.user);
                                    setSession(session);
                                    
                                    if (window.saveSessionToStorage) {
                                        window.saveSessionToStorage(session);
                                    }
                                }
                                break;

                            default:
                                // Handle other events if needed
                                if (session?.user) {
                                    setUser(session.user);
                                    setSession(session);
                                } else {
                                    setUser(null);
                                    setSession(null);
                                }
                        }
                    } catch (stateChangeError) {
                        console.warn('Auth state change error (handled gracefully):', stateChangeError.message);
                    }
                });

                setAuthInitialized(true);
                console.log('✅ Auth system initialized');

            } catch (error) {
                console.error('Auth initialization error:', error);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        const handlePostLoginFlow = async (session) => {
            try {
                // Update access_visits with login email
                const sessionId = localStorage.getItem('access_session');
                if (sessionId && session.user?.email) {
                    window.supabaseClient
                        .from('access_visits')
                        .update({ login_email: session.user.email })
                        .eq('session_id', sessionId)
                        .then(() => console.log('Access visit updated'))
                        .catch(err => console.warn('Access visit update failed:', err.message));
                }

                // Handle post-login return
                const goBack = sessionStorage.getItem('postLoginReturn');
                if (goBack) {
                    sessionStorage.removeItem('postLoginReturn');
                    window.location.hash = goBack;
                    return;
                }

                // Handle invitation flows
                const inviteAction = localStorage.getItem('invite_action');
                if (inviteAction) {
                    const { returnUrl } = JSON.parse(inviteAction);
                    localStorage.removeItem('invite_action');
                    
                    if (returnUrl) {
                        setTimeout(() => window.location.href = returnUrl, 100);
                    }
                }
            } catch (error) {
                console.warn('Post-login flow error:', error.message);
            }
        };

        const redirectToLoginIfNeeded = () => {
            const currentHash = window.location.hash;
            const publicRoutes = ['#/', '#/login', '#/signup', '#/forgot-password', '#/how-it-works'];
            const isPublicRoute = publicRoutes.some(route => currentHash.startsWith(route));
            
            if (!isPublicRoute) {
                console.log('Redirecting to login - user signed out from protected route');
                window.location.hash = '#/login';
            }
        };

        initAuth();

        return () => {
            mounted = false;
            if (authSubscription?.data?.subscription) {
                authSubscription.data.subscription.unsubscribe();
            }
        };
    }, []);

    // Session guard hook
    const requireAuth = React.useCallback(() => {
        if (!loading && authInitialized && !session?.user) {
            console.log('🚫 Session required - redirecting to login');
            window.location.hash = '#/login';
            return false;
        }
        return true;
    }, [loading, authInitialized, session]);

    const value = {
        user,
        session,
        loading,
        authInitialized,
        requireAuth,
        supabaseClient: window.supabaseClient
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Make auth components globally available
window.AuthContext = AuthContext;
window.AuthProvider = AuthProvider;
window.useAuth = () => {
    const context = React.useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

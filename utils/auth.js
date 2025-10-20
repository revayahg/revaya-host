

// Simple session management using localStorage
function saveSessionToStorage(session) {
    try {
        if (session && session.user) {
            localStorage.setItem('revaya_session', JSON.stringify({
                user: session.user,
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at || Math.floor(Date.now() / 1000) + 3600,
                saved_at: Date.now()
            }));
        }
    } catch (error) {
    }
}

function getSessionFromStorage() {
    try {
        const stored = localStorage.getItem('revaya_session');
        if (stored) {
            const session = JSON.parse(stored);
            // Check if session is still valid (not older than 1 hour)
            const now = Date.now();
            if (session.saved_at && (now - session.saved_at) < 3600000) {
                return session;
            } else {
                localStorage.removeItem('revaya_session');
            }
        }
    } catch (error) {
        localStorage.removeItem('revaya_session');
    }
    return null;
}

function clearStoredSession() {
    try {
        localStorage.removeItem('revaya_session');
    } catch (error) {
    }
}

// Get current session with simple caching and graceful error handling
async function getCurrentSession() {
    try {
        if (!window.supabaseClient) {
            return null;
        }

        // Check memory cache first
        if (window._currentSession && window._currentSession.user?.id) {
            return window._currentSession;
        }

        // Check localStorage cache
        const storedSession = getSessionFromStorage();
        if (storedSession && storedSession.user?.id) {
            window._currentSession = storedSession;
            return storedSession;
        }

        // Try to get fresh session from Supabase with enhanced error handling
        try {
            const session = await window.getSessionWithRetry?.(3, 150);
            if (session?.user?.id) {
                window._currentSession = session;
                saveSessionToStorage(session);
                window.Environment?.devLog('Fresh session retrieved:', session.user.email || session.user.id);
                return session;
            }
        } catch (sessionError) {
        }

        // Try getting user as fallback with enhanced error handling
        try {
            const { data: { user }, error } = await window.supabaseClient.auth.getUser();
            if (!error && user?.id) {
                const session = {
                    user: user,
                    access_token: 'temp-' + Date.now(),
                    expires_at: Math.floor(Date.now() / 1000) + 3600
                };
                window._currentSession = session;
                saveSessionToStorage(session);
                window.Environment?.devLog('Session created from user:', user.email || user.id);
                return session;
            }
            if (error) {
            }
        } catch (userError) {
        }

        window.Environment?.devLog('No valid session found, user needs to log in');
        return null;
    } catch (error) {
        return null;
    }
}



// Login function with localStorage session management
async function login(email, password) {
    try {
        if (!window.supabaseClient) {
            return { error: { message: 'Authentication service not available' } };
        }

        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email: email.trim(),
            password
        });

        if (error) {
            return { error };
        }

        if (data.session && data.session.user) {
            window._currentSession = data.session;
            saveSessionToStorage(data.session);
            window.Environment?.devLog('Login successful:', data.session.user.email);
        }

        return data;
    } catch (error) {
        return { error: { message: 'Login failed' } };
    }
}

// Logout function with localStorage cleanup
async function logout() {
    try {
        
        // Clear session cache and storage immediately
        clearSessionCache();
        
        // Clear any event listeners that might cause errors
        try {
            window.removeEventListener('hashchange', () => {});
            window.removeEventListener('beforeunload', () => {});
        } catch (e) {
            // Ignore errors clearing event listeners
        }
        
        if (window.supabaseClient) {
            try {
                const { error } = await window.supabaseClient.auth.signOut();
                if (error) {
                }
            } catch (supabaseError) {
            }
        }
        
        // Clear any additional local storage items
        try {
            localStorage.removeItem('supabase.auth.token');
            localStorage.removeItem('revaya_session');
            // Clear any other session-related items
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('sb-') || key.includes('auth') || key.includes('session')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (storageError) {
        }
        
        window.Environment?.devLog('✅ Logout successful');
        
        // Force page reload to ensure clean state
        window.location.href = window.location.origin + '/#/';
        
    } catch (error) {
        // Still clear local session and redirect even if errors occur
        try {
            clearSessionCache();
            localStorage.clear(); // Clear all localStorage on error
        } catch (e) {
            // Ignore cleanup errors
        }
        window.location.href = window.location.origin + '/#/';
    }
}

// useAuth hook deprecated - use context directly:
// const context = React.useContext(window.AuthContext || React.createContext({}));
// const { user, session, loading } = context;

// Clear session cache
function clearSessionCache() {
    window._currentSession = null;
    clearStoredSession();
}

// Enhanced session validation with detailed logging
function validateSession(session) {
    try {
        if (!session) {
            return false;
        }
        
        if (!session.user) {
            return false;
        }
        
        if (!session.user.id) {
            return false;
        }
        
        // Check if session is expired
        if (session.expires_at && Date.now() / 1000 > session.expires_at) {
            return false;
        }
        
        window.Environment?.devLog('✓ Session validation passed for user:', session.user.email || session.user.id);
        return true;
    } catch (error) {
        return false;
    }
}

// Enhanced session recovery with multiple strategies
async function getSessionWithRetry(maxRetries = 3, delay = 200) {
    window.Environment?.devLog('Starting session recovery...');
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            // Strategy 1: Use getCurrentSession
            let session = await getCurrentSession();
            if (session && session.user && session.user.id) {
                window.Environment?.devLog(`Session recovered on attempt ${i + 1} via getCurrentSession`);
                return session;
            }
            
            // Strategy 2: Try direct Supabase call with basic retry
            if (window.supabaseClient && i === 0) { // Only try direct call on first attempt to avoid recursion
                try {
                    const { data, error } = await window.supabaseClient.auth.getSession();
                    if (!error && data?.session?.user?.id) {
                        session = data.session;
                        window._currentSession = session;
                        saveSessionToStorage(session);
                        return session;
                    }
                    if (error && error.message !== 'Auth session missing!') {
                    }
                } catch (directError) {
                    if (directError.message !== 'Auth session missing!') {
                    }
                }
            }
            
            // Strategy 3: Check localStorage
            const storedSession = getSessionFromStorage();
            if (storedSession && storedSession.user?.id) {
                window._currentSession = storedSession;
                return storedSession;
            }
            
        } catch (error) {
            if (error.message !== 'Auth session missing!') {
            }
        }
        
        if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    return null;
}

// Safe session getter that doesn't throw errors
async function getSessionSafe() {
    try {
        const session = await getSessionWithRetry(3, 200);
        return session;
    } catch (error) {
        return null;
    }
}

// Check if user is authenticated without throwing errors
function isAuthenticated() {
    try {
        const session = window._currentSession || getSessionFromStorage();
        return !!(session && session.user && session.user.id);
    } catch (error) {
        return false;
    }
}

// Enhanced logout to clear session cache (alias for logout)
async function logoutEnhanced() {
    return await logout();
}

// Make session storage functions globally available
window.saveSessionToStorage = saveSessionToStorage;
window.getSessionFromStorage = getSessionFromStorage;
window.clearStoredSession = clearStoredSession;

// Unified password reset redirect URL - NO /index.html usage
const RESET_REDIRECT = `${window.location.origin}/#/reset-password`;

// Export for use in other components
window.RESET_REDIRECT = RESET_REDIRECT;

// Password reset function with proper error handling
async function resetPassword(email) {
    try {
        if (!window.supabaseClient) {
            return { error: { message: 'Authentication service not available' } };
        }

        if (!email || !email.trim()) {
            return { error: { message: 'Email is required' } };
        }

        window.Environment?.devLog('Sending password reset email to:', email);
        window.Environment?.devLog('Reset redirect URL:', RESET_REDIRECT);
        
        const { data, error } = await window.supabaseClient.auth.resetPasswordForEmail(
            email.trim(),
            {
                redirectTo: RESET_REDIRECT
            }
        );

        if (error) {
            return { error };
        }

        window.Environment?.devLog('Password reset email sent successfully');
        return { data };
    } catch (error) {
        return { error: { message: 'Failed to send reset email' } };
    }
}

// Make functions globally available
window.getCurrentSession = getCurrentSession;
window.getSessionWithRetry = getSessionWithRetry;
window.getSessionSafe = getSessionSafe;
window.isAuthenticated = isAuthenticated;
window.validateSession = validateSession;
window.login = login;
window.logout = logoutEnhanced;
window.resetPassword = resetPassword;
window.RESET_REDIRECT = RESET_REDIRECT;
// useAuth deprecated - use context directly instead
window.clearSessionCache = clearSessionCache;

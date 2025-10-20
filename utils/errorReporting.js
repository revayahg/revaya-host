// Enhanced Error Reporting System
// Provides comprehensive error tracking and reporting with special handling for auth errors

let errorCount = 0;
const maxErrors = 10; // Prevent infinite error loops
const reportedErrors = new Set(); // Prevent duplicate reports

// Enhanced error reporting function
function reportError(error, context = 'unknown') {
    try {
        // Prevent infinite error loops
        if (errorCount >= maxErrors) {
            return;
        }
        
        errorCount++;
        
        // Create error signature to prevent duplicates
        const errorSignature = `${error.name || 'Error'}: ${error.message || 'Unknown error'}`;
        if (reportedErrors.has(errorSignature)) {
            return; // Already reported this error
        }
        reportedErrors.add(errorSignature);
        
        // Enhanced error information
        const errorInfo = {
            message: error.message || 'Unknown error',
            name: error.name || 'Error',
            stack: error.stack || 'No stack trace available',
            context: context,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            authState: isAuthError(error) ? 'auth-related' : 'normal'
        };
        
        // Log to console with enhanced formatting
        console.group('🚨 Error Report');
        console.groupEnd();
        
        // Handle auth-specific errors
        if (isAuthError(error)) {
            handleAuthError(error, errorInfo);
        }
        
        // Store error for potential debugging
        storeErrorLocally(errorInfo);
        
    } catch (reportingError) {
    }
}

// Check if error is auth-related
function isAuthError(error) {
    if (!error || !error.message) return false;
    
    const authErrorPatterns = [
        'Auth session',
        'Authentication required',
        'No authenticated user',
        'session missing',
        'Invalid session',
        'Session expired',
        'Unauthorized',
        'Authentication failed'
    ];
    
    return authErrorPatterns.some(pattern => 
        error.message.toLowerCase().includes(pattern.toLowerCase())
    );
}

// Handle auth-specific errors with recovery attempts
function handleAuthError(error, errorInfo) {
    
    try {
        // Clear potentially corrupted auth state
        if (window.clearSessionCache) {
            window.clearSessionCache();
        }
        
        // Clear window auth variables
        window.currentUser = null;
        window._currentSession = null;
        
        // Clear localStorage auth data
        localStorage.removeItem('revaya_session');
        localStorage.removeItem('supabase.auth.token');
        
        // Attempt graceful sign out
        if (window.supabaseClient && window.supabaseClient.auth) {
            window.supabaseClient.auth.signOut().catch(signOutError => {
            });
        }
        
        
    } catch (recoveryError) {
    }
}

// Store error locally for debugging
function storeErrorLocally(errorInfo) {
    try {
        const storedErrors = JSON.parse(localStorage.getItem('app_errors') || '[]');
        storedErrors.push(errorInfo);
        
        // Keep only last 20 errors to prevent storage bloat
        if (storedErrors.length > 20) {
            storedErrors.splice(0, storedErrors.length - 20);
        }
        
        localStorage.setItem('app_errors', JSON.stringify(storedErrors));
    } catch (storageError) {
    }
}

// Global error handlers
window.addEventListener('error', (event) => {
    reportError(event.error || new Error(event.message), 'global-error');
});

window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason || new Error('Unhandled promise rejection'), 'unhandled-promise');
});

// Make functions globally available
window.reportError = reportError;
window.isAuthError = isAuthError;
window.handleAuthError = handleAuthError;


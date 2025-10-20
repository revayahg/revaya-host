// Environment detection utility
window.Environment = {
    isDevelopment() {
        // Check if we're in development environment
        const hostname = window.location.hostname;
        const isDev = hostname === 'localhost' || 
                     hostname === '127.0.0.1' || 
                     hostname.includes('preview') ||
                     hostname.includes('staging') ||
                     hostname.includes('dev');
        return isDev;
    },

    isProduction() {
        return !this.isDevelopment();
    },

    // Development-only logging
    devLog(...args) {
        if (this.isDevelopment()) {
        }
    },

    // Development-only warnings
    devWarn(...args) {
        if (this.isDevelopment()) {
        }
    },

    // Production-safe error logging (always logs errors)
    error(...args) {
    }
};
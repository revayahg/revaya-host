// Graceful getUser function that never throws errors
async function getUser() {
    try {
        if (!window.supabaseClient) {
            return null;
        }

        // Use retry-based session getter
        const session = await window.getSessionWithRetry?.(3, 150);
        if (session?.user) {
            return session.user;
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

// Make function globally available
window.getUser = getUser;

// Email Interceptor - Routes emails to mock system in development
// This file should be loaded before other email services

const emailInterceptor = {
    // Check if we're in development
    isDevelopment() {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    },

    // Intercept Supabase function calls for email services
    interceptSupabaseFunctions() {
        if (!this.isDevelopment()) return;

        const originalInvoke = window.supabaseClient.functions.invoke;
        
        window.supabaseClient.functions.invoke = async (functionName, options) => {
            // Check if this is an email function
            if (functionName === 'send-collaborator-invitation' || 
                functionName === 'send-invitation-email') {
                
                
                // Route to mock system
                const emailData = options.body;
                
                if (functionName === 'send-collaborator-invitation') {
                    return await window.developmentEmailMock.sendCollaboratorInvitation(
                        emailData.email,
                        emailData.inviter_name,
                        emailData.event_id,
                        emailData.invitation_token,
                        emailData.event_name
                    );
                } else if (functionName === 'send-invitation-email') {
                    return await window.developmentEmailMock.sendVendorInvitation(
                        emailData.to,
                        emailData.vendor_name,
                        emailData.event_name,
                        emailData.invitation_token
                    );
                }
            }
            
            // For non-email functions, call the original
            return originalInvoke.call(window.supabaseClient.functions, functionName, options);
        };
    },

    // Intercept direct fetch calls to email services
    interceptFetchCalls() {
        if (!this.isDevelopment()) return;

        const originalFetch = window.fetch;
        
        window.fetch = async (url, options) => {
            // Check if this is a call to email edge functions
            if (typeof url === 'string' && 
                (url.includes('send-collaborator-invitation') || 
                 url.includes('send-invitation-email'))) {
                
                
                // Parse the request body
                let emailData = {};
                if (options && options.body) {
                    try {
                        emailData = JSON.parse(options.body);
                    } catch (e) {
                    }
                }
                
                // Route to appropriate mock function
                if (url.includes('send-collaborator-invitation')) {
                    const result = await window.developmentEmailMock.sendCollaboratorInvitation(
                        emailData.email,
                        emailData.inviter_name,
                        emailData.event_id,
                        emailData.invitation_token,
                        emailData.event_name
                    );
                    
                    // Return a mock Response object
                    return new Response(JSON.stringify(result), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                } else if (url.includes('send-invitation-email')) {
                    const result = await window.developmentEmailMock.sendVendorInvitation(
                        emailData.to,
                        emailData.vendor_name,
                        emailData.event_name,
                        emailData.invitation_token
                    );
                    
                    // Return a mock Response object
                    return new Response(JSON.stringify(result), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }
            
            // For non-email calls, use original fetch
            return originalFetch.call(window, url, options);
        };
    },

    // Initialize the interceptor
    init() {
        if (!this.isDevelopment()) {
            return;
        }

        
        // Wait for developmentEmailMock to be loaded
        const checkMock = () => {
            if (window.developmentEmailMock) {
                this.interceptSupabaseFunctions();
                this.interceptFetchCalls();
            } else {
                setTimeout(checkMock, 100);
            }
        };
        
        checkMock();
    }
};

// Auto-initialize when script loads
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => emailInterceptor.init());
    } else {
        emailInterceptor.init();
    }
}

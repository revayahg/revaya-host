function CollaboratorInviteResponse() {
    const [loading, setLoading] = React.useState(true);
    const [result, setResult] = React.useState(null);
    const [accepting, setAccepting] = React.useState(false);

    const authContext = React.useContext(window.AuthContext || React.createContext({}));
    const { user, session } = authContext;

    React.useEffect(() => {
        
        // Immediate token test
        const testToken = getInvitationToken();
        
        // Test API availability
        if (window.collaboratorAPI?.testAPI) {
            const testResult = window.collaboratorAPI.testAPI();
        } else {
        }
        
        processInvitation();
    }, []);

    // Handle returning from login with pending invitation
    React.useEffect(() => {
        const handleLoginReturn = async () => {
            const pendingToken = localStorage.getItem('pendingCollaboratorInvitation');
            if (pendingToken && !getInvitationToken()) {
                // User returned from login, process the pending invitation
                setLoading(true);
                try {
                    const response = await window.collaboratorAPI.acceptInvitationByToken();
                    if (response && response.success) {
                        
                const successMessage = response.message || 'Invitation accepted successfully!';
                window.showToast && window.showToast(successMessage, 'success');
                
                // Show success message and redirect to dashboard
                setResult({
                    ...result,
                    success: true,
                    accepted: true,
                    message: '✓ Invitation accepted successfully! Redirecting to dashboard...'
                });
                
                // Redirect to dashboard after a short delay
                setTimeout(() => {
                        window.location.href = '#/dashboard';
                }, 2000);
                    } else {
                        const errorMsg = response?.error || 'Failed to accept invitation';
                        setResult({ success: false, error: errorMsg });
                    }
                } catch (error) {
                    setResult({ success: false, error: 'Failed to process invitation' });
                }
                setLoading(false);
            }
        };

        // Check for pending invitation on component mount
        handleLoginReturn();
    }, []);

    const getInvitationToken = () => {
        
        const fullUrl = window.location.href;
        console.log('🔍 CollaboratorInviteResponse: Full URL:', fullUrl);
        let token = null;
        
        // Test all possible extraction methods with detailed logging
        
        // Method 1: URLSearchParams from search (prioritize 'token' parameter)
        try {
            if (window.location.search) {
                const searchParams = new URLSearchParams(window.location.search);
                token = searchParams.get('token') || searchParams.get('invitation');
            }
        } catch (e) {
        }
        
        // Method 2: URLSearchParams from hash (prioritize 'token' parameter)
        if (!token) {
            try {
                if (window.location.hash && window.location.hash.includes('?')) {
                    const hashQuery = window.location.hash.split('?')[1];
                    const hashParams = new URLSearchParams(hashQuery);
                    token = hashParams.get('token') || hashParams.get('invitation');
                }
            } catch (e) {
            }
        }
        
        // Method 3: Enhanced regex for token= (handles both ? and # contexts)
        if (!token) {
            const tokenRegex = /[?&#]token=([^&#]+)/i;
            const match = fullUrl.match(tokenRegex);
            if (match) {
                token = match[1];
            }
        }
        
        // Method 4: Enhanced regex for invitation= (handles both ? and # contexts)
        if (!token) {
            const inviteRegex = /[?&#]invitation=([^&#]+)/i;
            const match = fullUrl.match(inviteRegex);
            if (match) {
                token = match[1];
            }
        }
        
        // Method 5: Direct collab_ pattern search
        if (!token) {
            const collabRegex = /(collab_[a-zA-Z0-9]+)/i;
            const match = fullUrl.match(collabRegex);
            if (match) {
                token = match[1];
            }
        }
        
        // Method 6: UUID pattern search
        if (!token) {
            const uuidRegex = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
            const match = fullUrl.match(uuidRegex);
            if (match) {
                token = match[1];
            }
        }
        
        // Method 7: localStorage fallback
        if (!token) {
            token = localStorage.getItem('pendingCollaboratorInvitation');
        }
        
        // Clean up token
        if (token) {
            const originalToken = token;
            token = token.trim();
            
            // Remove URL encoding if present
            if (token.includes('%')) {
                try {
                    token = decodeURIComponent(token);
                } catch (e) {
                }
            }
            
            // Remove trailing fragments
            token = token.replace(/[&#].*$/, '');
        }
        
        // Validation
        const isCollab = token ? /^collab_[a-zA-Z0-9]+$/i.test(token) : false;
        const isUUID = token ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token) : false;
        const isValid = isCollab || isUUID;
        
        
        if (!token) {
        }
        
        console.log('🔍 CollaboratorInviteResponse: Final extracted token:', token);
        return token || null;
    };

    const processInvitation = async () => {
        try {
            const invitationToken = getInvitationToken();
            console.log('🔍 CollaboratorInviteResponse: Retrieved token from URL:', invitationToken);

            if (!invitationToken) {
                setResult({
                    success: false,
                    error: 'Invalid invitation link - no token found'
                });
                return;
            }


            // Check if user is logged in
            if (!session?.user) {
                // Store invitation for after login
                localStorage.setItem('pendingCollaboratorInvitation', invitationToken);
                localStorage.setItem('pending_invitation_action', 'collaborator-invite-response');
                
                // Redirect to login
                window.location.href = '#/login';
                return;
            }


            // Get invitation details with comprehensive error handling
            let invitation = null;
            let invitationError = null;
            
            try {
                const result = await window.supabaseClient
                    .from('event_collaborator_invitations')
                    .select('*')
                    .eq('invitation_token', invitationToken)
                    .single();
                    
                invitation = result.data;
                invitationError = result.error;
            } catch (queryError) {
                invitationError = queryError;
            }


            if (invitationError) {
                if (invitationError.code === 'PGRST116' || invitationError.message?.includes('No rows found')) {
                    setResult({
                        success: false,
                        error: 'Invitation not found or already processed'
                    });
                } else if (invitationError.code === '406' || invitationError.status === 406) {
                    // 406 errors are often policy-related, try alternative approach
                    try {
                        // Try using RPC function as fallback for 406 errors
                        const { data: rpcResult, error: rpcError } = await window.supabaseClient
                            .rpc('get_invitation_by_token', { token: invitationToken });
                        
                        if (rpcError || !rpcResult) {
                            setResult({
                                success: false,
                                error: 'This invitation link appears to be invalid or expired. Please request a new invitation from the event organizer.'
                            });
                        } else {
                            invitation = rpcResult;
                        }
                    } catch (fallbackError) {
                        setResult({
                            success: false,
                            error: 'Unable to access this invitation. The link may be invalid or you may not have permission to view it.'
                        });
                        return;
                    }
                } else {
                    setResult({
                        success: false,
                        error: `Database access error. Please try again later or contact support if the problem persists.`
                    });
                }
                
                if (!invitation) {
                    return;
                }
            }

            if (!invitation) {
                setResult({
                    success: false,
                    error: 'Invitation not found'
                });
                return;
            }


            // Check invitation status
            if (invitation.status !== 'pending') {
                if (invitation.status === 'accepted') {
                    setResult({
                        success: false,
                        error: 'This invitation has already been accepted'
                    });
                } else {
                    setResult({
                        success: false,
                        error: `This invitation is ${invitation.status} and cannot be accepted`
                    });
                }
                return;
            }

            // Get event details
            const { data: eventDetails, error: eventError } = await window.supabaseClient
                .from('events')
                .select('id, name, title, start_date, location')
                .eq('id', invitation.event_id)
                .single();


            if (eventError) {
                // Continue anyway, we can still show the invitation
            }

            setResult({
                success: true,
                invitation,
                eventDetails: eventDetails || null,
                invitationToken
            });

        } catch (error) {
            setResult({
                success: false,
                error: 'Failed to process invitation: ' + error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        try {
            setAccepting(true);
            
            
            // First, validate we have a session
            if (!session || !session.user) {
                window.showToast && window.showToast('Please log in first to accept the invitation', 'error');
                return;
            }
            
            
            const token = result.invitationToken;
            
            // Minimal token validation - just check if it exists
            if (!token || token.trim() === '') {
                throw new Error('No invitation token provided');
            }
            
            // Test direct Supabase connection before API call
            try {
                const { data: testData, error: testError } = await window.supabaseClient
                    .from('event_collaborator_invitations')
                    .select('id')
                    .limit(1);
                    
                
                if (testError) {
                    throw new Error('Database connection failed');
                }
            } catch (dbError) {
                throw new Error('Cannot connect to database');
            }
            
            
            // Validate token format before proceeding (accept both UUID and collab_ formats)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const collabRegex = /^collab_[a-zA-Z0-9]+$/;
            if (!uuidRegex.test(token) && !collabRegex.test(token)) {
                throw new Error('Invalid invitation token format. Please check your invitation link.');
            }
            
            // Ensure the API function exists
            if (!window.collaboratorAPI || !window.collaboratorAPI.acceptInvitationByToken) {
                throw new Error('Invitation system not loaded properly. Please refresh the page and try again.');
            }
            
            // Call the API with detailed logging
            const response = await window.collaboratorAPI.acceptInvitationByToken(token);
            
            if (response && response.success) {
                
                // Clear stored invitation token
                localStorage.removeItem('pendingCollaboratorInvitation');
                
                // Dispatch comprehensive events for real-time updates
                window.dispatchEvent(new CustomEvent('collaboratorUpdated', {
                    detail: { 
                        eventId: result.invitation.event_id, 
                        type: 'invitation_accepted',
                        userId: session.user.id 
                    }
                }));
                window.dispatchEvent(new CustomEvent('eventsUpdated'));
                window.dispatchEvent(new CustomEvent('dashboardRefresh'));
                
                const successMessage = 'Invitation accepted successfully! You are now a collaborator on this event.';
                window.showToast && window.showToast(successMessage, 'success');
                
                // Update the result to show success state
                setResult({
                    ...result,
                    accepted: true,
                    success: true,
                    message: '✓ Invitation accepted successfully! Redirecting to dashboard...'
                });

                // Redirect to dashboard after showing success
                setTimeout(() => {
                    window.location.href = '#/dashboard';
                }, 2000);
                
            } else {
                const errorMsg = response?.error || 'Failed to accept invitation';
                window.showToast && window.showToast(errorMsg, 'error');
            }
        } catch (error) {
            
            let userFriendlyMsg;
            if (error.message?.includes('not found') || error.message?.includes('expired')) {
                userFriendlyMsg = 'This invitation link is no longer valid or has expired.';
            } else if (error.message?.includes('Database') || error.message?.includes('connection')) {
                userFriendlyMsg = 'Database connection error. Please try again in a moment.';
            } else if (error.message?.includes('Authentication') || error.message?.includes('log in')) {
                userFriendlyMsg = 'Please log in first to accept this invitation.';
            } else {
                userFriendlyMsg = `Failed to accept invitation: ${error.message}`;
            }
            
            window.showToast && window.showToast(userFriendlyMsg, 'error');
        } finally {
            setAccepting(false);
        }
    };

    const handleDecline = async () => {
        try {
            console.log('🔍 handleDecline called with token:', result.invitationToken);
            await window.collaboratorAPI.declineInvitationByToken(result.invitationToken);
            console.log('✅ declineInvitationByToken completed successfully');
            window.showToast && window.showToast('Invitation declined', 'info');
            
            // Force refresh of notifications after decline
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('notificationRead'));
            }, 1000);
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '#/dashboard';
            }, 2000);
        } catch (error) {
            console.error('❌ handleDecline error:', error);
            window.showToast && window.showToast('Failed to decline invitation', 'error');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Processing invitation...</p>
                </div>
            </div>
        );
    }

    if (!result?.success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <div className="icon-alert-circle text-2xl text-red-600"></div>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invitation</h2>
                    <p className="text-gray-600 mb-6">{result?.error || 'This invitation link is invalid or expired.'}</p>
                    <a
                        href="#/dashboard"
                        className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Go to Dashboard
                    </a>
                </div>
            </div>
        );
    }

    // Show success state if invitation was accepted
    if (result?.accepted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                        <div className="icon-check text-2xl text-green-600"></div>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Invitation Accepted!</h2>
                    <p className="text-gray-600 mb-6">{result.message}</p>
                    <button 
                        onClick={() => window.location.href = '#/dashboard'}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto"
                    >
                        <div className="icon-arrow-right text-sm"></div>
                        <span>Go to Dashboard</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <div className="icon-users text-2xl text-indigo-600"></div>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Event Collaboration Invitation
                    </h2>
                    <p className="text-gray-600">
                        You've been invited to collaborate on an event
                    </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-gray-900 mb-2">
                        {result.eventDetails?.name || result.eventDetails?.title || 'Event'}
                    </h3>
                    {result.eventDetails?.start_date && (
                        <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">Date:</span> {new Date(result.eventDetails.start_date).toLocaleDateString()}
                        </p>
                    )}
                    {result.eventDetails?.location && (
                        <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">Location:</span> {result.eventDetails.location}
                        </p>
                    )}
                    <p className="text-sm text-gray-600">
                        <span className="font-medium">Role:</span> {result.invitation.role}
                    </p>
                    <p className="text-sm text-gray-600">
                        <span className="font-medium">Invited by:</span> {result.invitation.invited_by_name || 'Event Organizer'}
                    </p>
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={handleDecline}
                        className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                    >
                        Decline
                    </button>
                    <button
                        onClick={handleAccept}
                        disabled={accepting}
                        className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {accepting ? (
                            <>
                                <div className="icon-loader-2 text-sm animate-spin"></div>
                                <span>Accepting...</span>
                            </>
                        ) : (
                            <>
                                <div className="icon-check text-sm"></div>
                                <span>Accept Invitation</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

window.CollaboratorInviteResponse = CollaboratorInviteResponse;
function InviteResponse() {
    const { user } = React.useContext(window.AuthContext);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState(false);
    const [invitation, setInvitation] = React.useState(null);

    // Use shared Supabase client
    const getSupabaseClient = () => {
        if (!window.supabaseClient) {
            return null;
        }
        return window.supabaseClient;
    };

    React.useEffect(() => {
        const processInvitationResponse = async () => {
            try {
                const supabaseClient = getSupabaseClient();
                if (!supabaseClient) {
                    setError('Failed to initialize database connection. Please try again.');
                    setLoading(false);
                    return;
                }

                // Extract invitation ID from URL - handle both query params and hash fragments
                let invitationId = null;
                
                // First try regular query parameters
                const urlParams = new URLSearchParams(window.location.search);
                invitationId = urlParams.get('invitation');
                
                // If not found, try hash fragment parameters
                if (!invitationId && window.location.hash) {
                    const hash = window.location.hash;
                    const questionIndex = hash.indexOf('?');
                    if (questionIndex !== -1) {
                        const hashParams = new URLSearchParams(hash.substring(questionIndex + 1));
                        invitationId = hashParams.get('invitation');
                    }
                }

                // Validate invitation ID format (UUID)
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                if (!invitationId || !uuidRegex.test(invitationId)) {
                    setError('Invalid invitation link format.');
                    setLoading(false);
                    return;
                }

                // Fetch the invitation record
                const { data, error: fetchError } = await supabaseClient
                    .from('event_invitations')
                    .select('*')
                    .eq('id', invitationId)
                    .single();

                if (fetchError || !data) {
                    setError('Invitation not found or has expired.');
                } else {
                    setInvitation(data);
                }
            } catch (error) {
                setError('An unexpected error occurred. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        processInvitationResponse();
    }, []);

    const handleResponse = async (response) => {
        setLoading(true);
        setError('');
        try {
            const supabaseClient = getSupabaseClient();
            if (!supabaseClient) throw new Error('DB init failed');
            
            const { error: updateError } = await supabaseClient
                .from('event_invitations')
                .update({ response })
                .eq('id', invitation.id);
                
            if (updateError) throw updateError;
            setSuccess(true);
            
            // Dispatch real-time update
            window.dispatchEvent(new CustomEvent('vendorInvitationResponse', {
                detail: { invitationId: invitation.id, response }
            }));
        } catch (err) {
            setError('Could not save your response. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return React.createElement('div', {
            className: 'min-h-screen flex items-center justify-center bg-gray-50',
            'data-name': 'invite-loading',
            'data-file': 'components/InviteResponse.js'
        },
            React.createElement('div', { className: 'text-center' },
                React.createElement(window.LoadingSpinner),
                React.createElement('p', { 
                    className: 'mt-4 text-gray-600' 
                }, 'Processing your invitation...')
            )
        );
    }

    if (error) {
        return React.createElement('div', {
            className: 'min-h-screen flex items-center justify-center bg-gray-50',
            'data-name': 'invite-error',
            'data-file': 'components/InviteResponse.js'
        },
            React.createElement('div', { className: 'text-center max-w-md mx-auto p-8' },
                React.createElement('div', {
                    className: 'icon-alert-circle text-6xl text-red-500 mb-4'
                }),
                React.createElement('h2', {
                    className: 'text-xl font-semibold text-gray-900 mb-2'
                }, 'Error'),
                React.createElement('p', {
                    className: 'text-gray-600 mb-6'
                }, error),
                React.createElement('button', {
                    className: 'bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700',
                    onClick: () => window.location.hash = '#/'
                }, 'Return Home')
            )
        );
    }

    // If invitation loaded and not yet responded, show Accept/Decline buttons
    if (invitation && !invitation.response && !success) {
        return React.createElement('div', { 
            className: 'min-h-screen flex items-center justify-center bg-gray-50',
            'data-name': 'invite-response',
            'data-file': 'components/InviteResponse.js'
        },
            React.createElement('div', { className: 'text-center p-8' },
                React.createElement('h2', { className: 'text-xl mb-4' }, 'You have been invited!'),
                React.createElement('div', { className: 'space-x-4' },
                    React.createElement('button', {
                        onClick: () => handleResponse('accepted'),
                        disabled: loading,
                        className: 'px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700'
                    }, 'Accept'),
                    React.createElement('button', {
                        onClick: () => handleResponse('declined'),
                        disabled: loading,
                        className: 'px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700'
                    }, 'Decline')
                ),
                error && React.createElement('p', { className: 'text-red-600 mt-4' }, error)
            )
        );
    }

    // Show success after response
    if (success) {
        return React.createElement('div', {
            className: 'min-h-screen flex items-center justify-center bg-gray-50',
            'data-name': 'invite-success',
            'data-file': 'components/InviteResponse.js'
        },
            React.createElement('div', { className: 'text-center max-w-md mx-auto p-8' },
                React.createElement('div', {
                    className: 'icon-check-circle text-6xl text-green-500 mb-4'
                }),
                React.createElement('h2', {
                    className: 'text-xl font-semibold text-gray-900 mb-2'
                }, 'Response Recorded!'),
                React.createElement('p', {
                    className: 'text-gray-600 mb-6'
                }, 'Thank you for responding to the invitation.'),
                React.createElement('button', {
                    className: 'bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700',
                    onClick: () => window.location.hash = '#/'
                }, 'Continue to Dashboard')
            )
        );
    }

    return null;
}

window.InviteResponse = InviteResponse;
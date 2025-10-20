function Login() {
    try {
        const [formData, setFormData] = React.useState({
            email: '',
            password: ''
        });
        
        const [loading, setLoading] = React.useState(false);
        const [error, setError] = React.useState(null);
        
        // Get redirect parameter from URL
        const getRedirectParam = () => {
            const hash = window.location.hash;
            const queryStart = hash.indexOf('?');
            if (queryStart === -1) return null;
            
            const queryString = hash.substring(queryStart + 1);
            const urlParams = new URLSearchParams(queryString);
            return urlParams.get('redirect');
        };

        const handleInputChange = (e) => {
            const { name, value } = e.target;
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
            if (error) setError(null);
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            setLoading(true);
            setError(null);

            // Basic validation
            if (!formData.email || !formData.password) {
                setError('Please fill in all fields');
                setLoading(false);
                return;
            }

            if (!window.validateEmail || !window.validateEmail(formData.email)) {
                setError('Please enter a valid email address');
                setLoading(false);
                return;
            }

            try {
                
                const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                    email: formData.email.trim(),
                    password: formData.password
                });

                if (error) {
                    
                    // Handle specific error types with better messaging
                    if (error.message.includes('Invalid login credentials')) {
                        setError('The email or password you entered is incorrect. Please check your credentials and try again, or create a new account if you don\'t have one.');
                    } else if (error.message.includes('Email not confirmed')) {
                        setError('Please check your email and click the confirmation link to activate your account before signing in.');
                    } else if (error.message.includes('Too many requests')) {
                        setError('Too many login attempts detected. Please wait a few minutes before trying again.');
                    } else if (error.message.includes('User not found') || error.message.includes('user_not_found')) {
                        setError('No account found with this email address. Please sign up for a new account or verify your email is correct.');
                    } else if (error.message.includes('signup_disabled')) {
                        setError('Account creation is currently disabled. Please contact support for assistance.');
                    } else if (error.message.includes('email_address_invalid')) {
                        setError('Please enter a valid email address.');
                    } else {
                        // For any other errors, provide a generic but helpful message
                        setError(`Unable to sign in at this time. Please check your credentials or try again later. If you don't have an account, please sign up first.`);
                    }
                    return;
                }

                
                // Show success message
                if (window.toast?.success) {
                    window.toast.success('Signed in successfully!');
                }
                
                // Check for pending collaborator invitation first
                const pendingInvitationToken = localStorage.getItem('pending_invitation_token');
                const pendingCollaboratorToken = localStorage.getItem('pendingCollaboratorInvitation');
                const urlParams = new URLSearchParams(window.location.search);
                const returnUrl = urlParams.get('return');
                const invitationFromUrl = urlParams.get('invitation');
                
                if (returnUrl === 'collaborator-invite-response' && (invitationFromUrl || pendingInvitationToken)) {
                    const tokenToUse = invitationFromUrl || pendingInvitationToken;
                    // Clear stored token and redirect to invitation response
                    localStorage.removeItem('pending_invitation_token');
                    setTimeout(() => {
                        window.location.hash = `#/collaborator-invite-response?invitation=${tokenToUse}`;
                    }, 100);
                    return;
                }

                // Check for pending collaborator invitation (new flow)
                if (pendingCollaboratorToken) {
                    // Don't clear token here - let the invitation response component handle it
                    setTimeout(() => {
                        window.location.hash = '#/collaborator-invite-response';
                    }, 100);
                    return;
                }
                
                // Check for pending vendor invitation
                const pendingInvitation = localStorage.getItem('pendingInvitation');
                if (pendingInvitation) {
                    try {
                        const inviteData = JSON.parse(pendingInvitation);
                        
                        // Clear the pending invitation
                        localStorage.removeItem('pendingInvitation');
                        
                        // Small delay then redirect to invitation processing
                        setTimeout(() => {
                            window.location.hash = `#/invite?invitation=${inviteData.invitationId}&response=accept`;
                        }, 100);
                        return;
                    } catch (error) {
                        localStorage.removeItem('pendingInvitation');
                    }
                }
                
                // Check if there's a return URL
                if (returnUrl) {
                    try {
                        const decodedUrl = decodeURIComponent(returnUrl);
                        setTimeout(() => {
                            window.location.href = decodedUrl;
                        }, 100);
                        return;
                    } catch (error) {
                    }
                }
                
                // Success - redirect based on parameter or default to dashboard
                const redirectTo = getRedirectParam();
                setTimeout(() => {
                    if (redirectTo === 'create-event') {
                        window.location.hash = '#/event-form';
                    } else {
                        window.location.hash = '#/dashboard';
                    }
                }, 100);
                
            } catch (err) {
                
                // Handle network and other errors
                if (err.message && err.message.includes('fetch')) {
                    setError('Network error. Please check your internet connection and try again.');
                } else if (err.message && err.message.includes('timeout')) {
                    setError('Connection timeout. Please try again.');
                } else {
                    setError('An unexpected error occurred. Please check your internet connection and try again, or contact support if the problem persists.');
                }
                
                if (window.reportError) {
                    reportError(err);
                }
            } finally {
                setLoading(false);
            }
        };

        return (
            <div data-name="login-page" className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    <div>
                        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                            {getRedirectParam() === 'create-event' ? 'Sign in to post your event' : 'Sign in to your account'}
                        </h2>
                        <p className="mt-2 text-center text-sm text-gray-600">
                            Don't have an account?{' '}
                            <a href={`#/signup${getRedirectParam() ? `?redirect=${getRedirectParam()}` : ''}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                                Sign up here
                            </a>
                        </p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="rounded-md bg-red-50 p-4" data-name="error-alert">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <i className="fas fa-exclamation-circle text-red-400"></i>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">
                                            {error}
                                        </h3>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="rounded-md shadow-sm -space-y-px">
                            <div>
                                <label htmlFor="email" className="sr-only">Email address</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                    placeholder="Email address"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    data-name="email-input"
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="sr-only">Password</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                    placeholder="Password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    data-name="password-input"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                                    loading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
                                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                                data-name="submit-button"
                            >
                                {loading ? (
                                    <span className="flex items-center">
                                        <i className="fas fa-spinner fa-spin mr-2"></i>
                                        Signing in...
                                    </span>
                                ) : (
                                    'Sign in'
                                )}
                            </button>
                        </div>

                        <div className="text-center mt-4">
                            <button
                                type="button"
                                onClick={() => window.location.hash = '#/forgot-password'}
                                className="text-sm text-indigo-600 hover:text-indigo-500 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded"
                                data-name="forgot-password-link"
                            >
                                Forgot your password?
                            </button>
                        </div>

                        <div className="mt-6 text-center">
                            <div className="text-sm text-gray-600">
                                <p className="mb-2">Having trouble signing in?</p>
                                <ul className="space-y-1 text-left">
                                    <li>• Make sure you've confirmed your email address</li>
                                    <li>• Check that your email and password are correct</li>
                                    <li>• Try refreshing the page and signing in again</li>
                                    <li>• If you don't have an account, <a href="#/signup" className="text-indigo-600 hover:text-indigo-500 font-medium">sign up here</a></li>
                                </ul>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        );
    } catch (error) {
        reportError(error);
        return null;
    }
}

window.Login = Login;

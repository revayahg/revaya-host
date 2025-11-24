function Signup() {
    try {
        const [firstName, setFirstName] = React.useState('');
        const [lastName, setLastName] = React.useState('');
        const [phone, setPhone] = React.useState('');
        const [email, setEmail] = React.useState('');
        const [password, setPassword] = React.useState('');
        const [confirmPassword, setConfirmPassword] = React.useState('');
        const [loading, setLoading] = React.useState(false);
        const [error, setError] = React.useState('');
        const [success, setSuccess] = React.useState(false);
        
        // Get redirect parameter from URL hash fragment
        const getRedirectParam = () => {
            const hash = window.location.hash;
            const queryStart = hash.indexOf('?');
            if (queryStart === -1) return null;
            
            const queryString = hash.substring(queryStart + 1);
            const urlParams = new URLSearchParams(queryString);
            return urlParams.get('redirect');
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            setLoading(true);
            setError('');

            // Trim inputs
            const trimmedFirstName = firstName.trim();
            const trimmedLastName = lastName.trim();
            const trimmedPhone = phone.trim();
            const trimmedEmail = email.trim();
            const trimmedPassword = password.trim();
            const trimmedConfirmPassword = confirmPassword.trim();

            // Validation
            if (!trimmedFirstName || !trimmedLastName || !trimmedEmail || !trimmedPassword || !trimmedConfirmPassword) {
                setError('Please fill in all required fields');
                setLoading(false);
                return;
            }

            // Test our validation first
            if (!window.validateEmail(trimmedEmail)) {
                setError('Please enter a valid email address (our validation failed)');
                setLoading(false);
                return;
            }

            if (trimmedPassword.length < 6) {
                setError('Password must be at least 6 characters long');
                setLoading(false);
                return;
            }

            if (trimmedPassword !== trimmedConfirmPassword) {
                setError('Passwords do not match');
                setLoading(false);
                return;
            }

            try {
                
                const { data, error } = await window.supabaseClient.auth.signUp({
                    email: trimmedEmail,
                    password: trimmedPassword,
                    options: {
                        data: {
                            first_name: trimmedFirstName,
                            last_name: trimmedLastName,
                            phone: trimmedPhone
                        }
                    }
                });


                if (error) {
                    
                    if (error.message.includes('User already registered') || error.message.includes('already_registered')) {
                        setError('An account with this email already exists. Please sign in instead or use the "Forgot Password" link if you need to reset your password.');
                    } else if (error.message.includes('invalid_email') || error.message.includes('email_address_invalid')) {
                        setError('Please enter a valid email address. Make sure it includes @ and a domain (like gmail.com).');
                    } else if (error.message.includes('weak_password') || error.message.includes('Password')) {
                        setError('Password must be at least 6 characters long and contain a mix of letters and numbers.');
                    } else if (error.message.includes('signup_disabled')) {
                        setError('New account creation is currently disabled. Please contact support for assistance.');
                    } else if (error.message.includes('rate_limit')) {
                        setError('Too many signup attempts. Please wait a few minutes before trying again.');
                    } else {
                        setError(`Unable to create your account: ${error.message}. Please try again or contact support if the problem continues.`);
                    }
                    return;
                }

                setSuccess(true);
                
                // Redirect based on parameter after successful signup
                const redirectTo = getRedirectParam();
                if (redirectTo === 'create-event') {
                    // Small delay to ensure state updates, then redirect to create event
                    setTimeout(() => {
                        window.location.hash = '#/event-form';
                    }, 2000);
                }
                
            } catch (error) {
                
                // Handle network and other errors
                if (error.message && error.message.includes('fetch')) {
                    setError('Network error. Please check your internet connection and try again.');
                } else if (error.message && error.message.includes('timeout')) {
                    setError('Connection timeout. Please try again.');
                } else {
                    setError('An unexpected error occurred while creating your account. Please check your internet connection and try again.');
                }
                
                if (window.reportError) {
                    reportError(error);
                }
            } finally {
                setLoading(false);
            }
        };

        if (success) {
            return (
                <div data-name="signup-success" className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-md w-full space-y-8 text-center">
                        <div className="rounded-md bg-green-50 p-4">
                            <div className="flex justify-center mb-4">
                                <i className="fas fa-check-circle text-green-400 text-4xl"></i>
                            </div>
                            <h2 className="text-lg font-medium text-green-800">Check your email</h2>
                            <p className="mt-2 text-sm text-green-700">
                                We've sent you a confirmation link at <strong>{email}</strong>
                            </p>
                            <p className="mt-2 text-sm text-green-700">
                                Please check your email and click the confirmation link to complete signup.
                            </p>
                            {getRedirectParam() === 'create-event' && (
                                <p className="mt-2 text-sm text-green-700 font-medium">
                                    After email verification, you'll be redirected to create your event!
                                </p>
                            )}
                        </div>
                        <div>
                            <a
                                href="#/login"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                            >
                                Return to login
                            </a>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div data-name="signup-container" className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    <div>
                        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                            {getRedirectParam() === 'create-event' ? 'Create account to post your event' : 'Create your account'}
                        </h2>
                        <p className="mt-2 text-center text-sm text-gray-600">
                            Or{' '}
                            <a href={`#/login${getRedirectParam() ? `?redirect=${getRedirectParam()}` : ''}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                                sign in to existing account
                            </a>
                        </p>
                    </div>
                    <form data-name="signup-form" className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div data-name="error-alert" className="rounded-md bg-red-50 p-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <i className="fas fa-exclamation-circle text-red-400"></i>
                                    </div>
                                    <div className="ml-3">
                                        <div className="text-sm text-red-700">{error}</div>
                                    </div>
                                </div>
                            </div>
                        )}


                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                                    <input
                                        data-name="first-name-input"
                                        id="firstName"
                                        name="firstName"
                                        type="text"
                                        required
                                        className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                        placeholder="First name"
                                        value={firstName}
                                        onChange={(e) => {
                                            setFirstName(e.target.value);
                                            if (error) setError('');
                                        }}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                                    <input
                                        data-name="last-name-input"
                                        id="lastName"
                                        name="lastName"
                                        type="text"
                                        required
                                        className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                        placeholder="Last name"
                                        value={lastName}
                                        onChange={(e) => {
                                            setLastName(e.target.value);
                                            if (error) setError('');
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input
                                    data-name="phone-input"
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                    placeholder="(555) 123-4567"
                                    value={phone}
                                    onChange={(e) => {
                                        setPhone(e.target.value);
                                        if (error) setError('');
                                    }}
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                                <input
                                    data-name="email-input"
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (error) setError('');
                                    }}
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                                <input
                                    data-name="password-input"
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                    placeholder="Password (min 6 characters)"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (error) setError('');
                                    }}
                                />
                            </div>

                            <div>
                                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                                <input
                                    data-name="confirm-password-input"
                                    id="confirm-password"
                                    name="confirm-password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        if (error) setError('');
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <input
                                id="privacy-agreement"
                                name="privacy-agreement"
                                type="checkbox"
                                required
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
                            />
                            <label htmlFor="privacy-agreement" className="text-sm text-gray-700">
                                I agree to the <a href="#/privacy" className="text-indigo-600 hover:text-indigo-500 underline">Privacy & Cookie Policy</a> and consent to the processing of my personal data as described.
                            </label>
                        </div>

                        <div>
                            <button
                                data-name="submit-button"
                                type="submit"
                                disabled={loading}
                                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                                    loading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
                                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                            >
                                {loading ? (
                                    <span className="flex items-center">
                                        <i className="fas fa-spinner fa-spin mr-2"></i>
                                        Creating account...
                                    </span>
                                ) : (
                                    <span className="flex items-center">
                                        <i className="fas fa-user-plus mr-2"></i>
                                        Sign up
                                    </span>
                                )}
                            </button>
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

window.Signup = Signup;

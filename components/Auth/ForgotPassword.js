function ForgotPassword() {
    try {
        const [email, setEmail] = React.useState('');
        const [loading, setLoading] = React.useState(false);
        const [error, setError] = React.useState('');
        const [success, setSuccess] = React.useState(false);

        const handleSubmit = async (e) => {
            e.preventDefault();

            if (loading) return;

            const trimmedEmail = email.trim();

            if (!trimmedEmail) {
                setError('Please enter the email address you used to sign up for Revaya Host.');
                return;
            }

            if (window.validateEmail && !window.validateEmail(trimmedEmail)) {
                setError('Please enter a valid email address (example: name@example.com).');
                return;
            }

            setLoading(true);
            setError('');
            setSuccess(false);
            if (trimmedEmail !== email) {
                setEmail(trimmedEmail);
            }

            try {
                
                if (window.supabaseClient?.functions?.invoke) {
                    try {
                        const { data: existenceData, error: existenceError } = await window.supabaseClient.functions.invoke('check-user-exists', {
                            body: { email: trimmedEmail }
                        });
                        window.Environment?.devLog?.('check-user-exists response', { existenceData, existenceError });

                        let existsFlag;
                        if (typeof existenceData === 'string') {
                            try {
                                const parsed = JSON.parse(existenceData);
                                existsFlag = parsed?.exists;
                            } catch (parseError) {
                                window.Environment?.devLog?.('check-user-exists parse error', parseError);
                            }
                        } else if (typeof existenceData === 'object' && existenceData !== null) {
                            existsFlag = existenceData.exists;
                        }

                        if (!existenceError && existsFlag === false) {
                            setError('We couldn\'t find a Revaya Host account with that email address. Double-check the spelling or sign up to create your account.');
                            return;
                        }

                        if (existenceError?.message) {
                            window.Environment?.devLog?.('check-user-exists failure', existenceError);
                        }
                    } catch (invokeError) {
                        window.Environment?.devLog?.('check-user-exists invocation error', invokeError);
                    }
                }

                const { error } = await window.supabaseClient.auth.resetPasswordForEmail(trimmedEmail, {
                    redirectTo: window.RESET_REDIRECT
                });

                if (error) throw error;
                setSuccess(true);
            } catch (error) {
                const rawMessage = error?.message || '';
                const normalizedMessage = rawMessage.toLowerCase();
                let displayMessage = 'We couldn\'t send the reset email right now. Please try again later or contact support if the issue continues.';

                if (
                    error?.code === 'user_not_found' ||
                    normalizedMessage.includes('user not found') ||
                    normalizedMessage.includes('user_not_found') ||
                    normalizedMessage.includes('no user') ||
                    normalizedMessage.includes('registered users') ||
                    (error?.status === 400 && normalizedMessage.includes('not allowed'))
                ) {
                    displayMessage = 'We couldn\'t find a Revaya Host account with that email address. Double-check the spelling or sign up to create your account.';
                } else if (normalizedMessage.includes('rate limit') || normalizedMessage.includes('too many requests')) {
                    displayMessage = 'Too many password reset attempts. Please wait a few minutes before trying again.';
                } else if (normalizedMessage.includes('invalid email')) {
                    displayMessage = 'Please enter a valid email address.';
                }

                setError(displayMessage);
            } finally {
                setLoading(false);
            }
        };

        if (success) {
            return (
                <div data-name="reset-success" className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-md w-full space-y-8 text-center">
                        <div className="rounded-md bg-green-50 p-4">
                            <h2 className="text-lg font-medium text-green-800">Check your email</h2>
                            <p className="mt-2 text-sm text-green-700">
                                We've sent a reset link to <strong>{email}</strong>. Check spam if you don't see it in a couple of minutes.
                            </p>
                            <p className="mt-2 text-xs text-green-600">
                                Click the link in the email to set your new password. The link will expire after some time for security.
                            </p>
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
            <div data-name="forgot-password-container" className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    <div>
                        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Reset your password</h2>
                        <p className="mt-2 text-center text-sm text-gray-600">
                            Or{' '}
                            <a href="#/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                                return to login
                            </a>
                        </p>
                    </div>
                    <form data-name="forgot-password-form" className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div data-name="error-alert" className="rounded-md bg-red-50 p-4">
                                <div className="text-sm text-red-700">{error}</div>
                            </div>
                        )}
                        <div>
                            <label htmlFor="email" className="sr-only">Email address</label>
                            <input
                                data-name="email-input"
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <button
                                data-name="submit-button"
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                {loading ? (
                                    <i className="fas fa-spinner fa-spin mr-2"></i>
                                ) : (
                                    <i className="fas fa-key mr-2"></i>
                                )}
                                Reset Password
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

window.ForgotPassword = ForgotPassword;

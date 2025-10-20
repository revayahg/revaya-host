function ForgotPassword() {
    try {
        const [email, setEmail] = React.useState('');
        const [loading, setLoading] = React.useState(false);
        const [error, setError] = React.useState('');
        const [success, setSuccess] = React.useState(false);

        const handleSubmit = async (e) => {
            e.preventDefault();
            setLoading(true);
            setError('');

            try {
                
                const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: window.RESET_REDIRECT
                });

                if (error) throw error;
                setSuccess(true);
            } catch (error) {
                setError(error.message);
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

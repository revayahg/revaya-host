function Settings() {
    try {
        const context = React.useContext(window.AuthContext || React.createContext({}));
        const { user } = context;
        const [loading, setLoading] = React.useState(false);
        const [error, setError] = React.useState('');
        const [success, setSuccess] = React.useState('');
        const [password, setPassword] = React.useState('');
        const [confirmPassword, setConfirmPassword] = React.useState('');

        const handlePasswordChange = async (e) => {
            e.preventDefault();
            setLoading(true);
            setError('');
            setSuccess('');

            if (password !== confirmPassword) {
                setError('Passwords do not match');
                setLoading(false);
                return;
            }

            try {
                const { error } = await window.supabaseClient.auth.updateUser({
                    password: password
                });

                if (error) throw error;
                setSuccess('Password updated successfully');
                setPassword('');
                setConfirmPassword('');
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        return (
            <div data-name="settings-container" className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white shadow sm:rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Account Settings</h3>
                            
                            <div className="mt-6 border-t border-gray-200 pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900">Email Address</h4>
                                        <p className="mt-1 text-sm text-gray-500">{user?.email}</p>
                                    </div>
                                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                        Verified
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6 border-t border-gray-200 pt-6">
                                <h4 className="text-sm font-medium text-gray-900">Change Password</h4>
                                <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
                                    {error && (
                                        <div data-name="error-alert" className="rounded-md bg-red-50 p-4">
                                            <div className="text-sm text-red-700">{error}</div>
                                        </div>
                                    )}
                                    {success && (
                                        <div data-name="success-alert" className="rounded-md bg-green-50 p-4">
                                            <div className="text-sm text-green-700">{success}</div>
                                        </div>
                                    )}
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                            New Password
                                        </label>
                                        <input
                                            data-name="password-input"
                                            type="password"
                                            id="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                                            Confirm New Password
                                        </label>
                                        <input
                                            data-name="confirm-password-input"
                                            type="password"
                                            id="confirm-password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <button
                                            data-name="submit-button"
                                            type="submit"
                                            disabled={loading}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            {loading ? (
                                                <i className="fas fa-spinner fa-spin mr-2"></i>
                                            ) : (
                                                <i className="fas fa-key mr-2"></i>
                                            )}
                                            Update Password
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        reportError(error);
        return null;
    }
}

window.Settings = Settings;

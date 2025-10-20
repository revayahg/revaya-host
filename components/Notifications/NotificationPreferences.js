// Notification Preferences Component
function NotificationPreferences() {
    const [preferences, setPreferences] = React.useState({
        email_messages: true,
        email_invitations: true,
        email_tasks: true,
        email_events: true,
        email_system: true
    });
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const { user } = React.useContext(AuthContext);

    React.useEffect(() => {
        if (user) {
            loadPreferences();
        }
    }, [user]);

    const loadPreferences = async () => {
        try {
            setLoading(true);
            const prefs = await notificationAPI.getPreferences(user.id);
            setPreferences(prefs);
        } catch (error) {
            showToast('Failed to load notification preferences', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePreferenceChange = (key, value) => {
        setPreferences(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const savePreferences = async () => {
        try {
            setSaving(true);
            await notificationAPI.updatePreferences(user.id, preferences);
            showToast('Notification preferences updated', 'success');
        } catch (error) {
            showToast('Failed to save preferences', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex justify-center items-center h-32">
                    <LoadingSpinner />
                </div>
            </div>
        );
    }

    const preferenceOptions = [
        { key: 'email_messages', label: 'New Messages', description: 'Receive emails when you get new messages' },
        { key: 'email_invitations', label: 'Event Invitations', description: 'Receive emails for event invitations' },
        { key: 'email_tasks', label: 'Task Assignments', description: 'Receive emails when tasks are assigned to you' },
        { key: 'email_events', label: 'Event Updates', description: 'Receive emails when events are updated' },
        { key: 'email_system', label: 'System Notifications', description: 'Receive emails for system announcements' }
    ];

    return (
        <div className="p-6" data-name="notification-preferences" data-file="components/Notifications/NotificationPreferences.js">
            <div className="max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
                
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <p className="text-gray-600 mb-6">
                        Choose how you want to receive notifications. You'll always receive in-app notifications, 
                        but you can control email notifications below.
                    </p>

                    <div className="space-y-6">
                        {preferenceOptions.map((option) => (
                            <div key={option.key} className="flex items-start space-x-3">
                                <input
                                    type="checkbox"
                                    id={option.key}
                                    checked={preferences[option.key]}
                                    onChange={(e) => handlePreferenceChange(option.key, e.target.checked)}
                                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <div className="flex-1">
                                    <label htmlFor={option.key} className="font-medium text-gray-900 cursor-pointer">
                                        {option.label}
                                    </label>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {option.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={savePreferences}
                            disabled={saving}
                            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {saving ? 'Saving...' : 'Save Preferences'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

window.NotificationPreferences = NotificationPreferences;
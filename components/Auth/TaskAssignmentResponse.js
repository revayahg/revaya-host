// Task Assignment Response Component
function TaskAssignmentResponse() {
    const [loading, setLoading] = React.useState(true);
    const [assignment, setAssignment] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [responding, setResponding] = React.useState(false);
    const [responseMessage, setResponseMessage] = React.useState('');

    React.useEffect(() => {
        loadAssignmentFromURL();
    }, []);

    async function loadAssignmentFromURL() {
        try {
            const hash = window.location.hash;
            let token = null;

            // Parse token from different URL formats
            if (hash.includes('task-response')) {
                const params = new URLSearchParams(hash.split('?')[1] || '');
                token = params.get('token');
            } else if (hash.includes('assignment=')) {
                const match = hash.match(/assignment=([^&]+)/);
                token = match ? match[1] : null;
            }

            if (!token) {
                setError('Invalid assignment link - no token found');
                setLoading(false);
                return;
            }


            const result = await window.notificationAPI.getTaskAssignmentByToken(token);

            if (!result.success) {
                setError(result.error || 'Assignment not found');
                setLoading(false);
                return;
            }

            setAssignment(result.assignment);
            setLoading(false);

        } catch (error) {
            setError('Failed to load assignment details');
            setLoading(false);
        }
    }

    async function handleResponse(responseType) {
        if (!assignment) return;

        setResponding(true);
        try {
            const token = new URLSearchParams(window.location.hash.split('?')[1] || '').get('token');
            
            const result = await window.notificationAPI.acceptTaskAssignment(
                token,
                responseType,
                responseMessage || null
            );

            if (result.success) {
                // Show success message and redirect after delay
                setTimeout(() => {
                    window.location.hash = '#/dashboard';
                }, 2000);
            } else {
                setError('Failed to record response');
            }
        } catch (error) {
            setError('Failed to record response');
        }
        setResponding(false);
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center" data-name="task-assignment-loading">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading assignment details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center" data-name="task-assignment-error">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
                    <div className="text-center">
                        <div className="icon-alert-circle text-4xl text-red-500 mb-4"></div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Assignment Not Found</h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            onClick={() => window.location.hash = '#/dashboard'}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const priorityColors = {
        high: 'bg-red-100 text-red-800',
        medium: 'bg-yellow-100 text-yellow-800',
        low: 'bg-green-100 text-green-800'
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12" data-name="task-assignment-response">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-indigo-600 px-6 py-4">
                        <h1 className="text-xl font-semibold text-white">Task Assignment</h1>
                        <p className="text-indigo-100 text-sm mt-1">You've been assigned a new task</p>
                    </div>

                    {/* Assignment Details */}
                    <div className="p-6">
                        <div className="space-y-6">
                            {/* Event Info */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Event</h3>
                                <p className="text-lg font-medium text-gray-900">{assignment.event.title}</p>
                                {assignment.event.description && (
                                    <p className="text-gray-600 text-sm mt-1">{assignment.event.description}</p>
                                )}
                            </div>

                            {/* Task Details */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Task</h3>
                                <h2 className="text-xl font-semibold text-gray-900 mb-3">{assignment.title}</h2>
                                
                                {assignment.task_description && (
                                    <p className="text-gray-700 mb-4">{assignment.task_description}</p>
                                )}

                                <div className="flex flex-wrap gap-4 text-sm">
                                    {assignment.priority && (
                                        <span className={`px-2 py-1 rounded-full ${priorityColors[assignment.priority] || 'bg-gray-100 text-gray-800'}`}>
                                            {assignment.priority.charAt(0).toUpperCase() + assignment.priority.slice(1)} Priority
                                        </span>
                                    )}
                                    {assignment.due_date && (
                                        <span className="text-gray-600">
                                            <span className="font-medium">Due:</span> {new Date(assignment.due_date).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Assigner Info */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Assigned By</h3>
                                <p className="text-gray-900">{assignment.assigner.name}</p>
                            </div>

                            {/* Response Message */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Response Message (Optional)
                                </label>
                                <textarea
                                    value={responseMessage}
                                    onChange={(e) => setResponseMessage(e.target.value)}
                                    placeholder="Add any comments or questions..."
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-gray-50 px-6 py-4 flex gap-3">
                        <button
                            onClick={() => handleResponse('accepted')}
                            disabled={responding}
                            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <div className="icon-check text-lg"></div>
                            {responding ? 'Processing...' : 'Accept Task'}
                        </button>
                        <button
                            onClick={() => handleResponse('declined')}
                            disabled={responding}
                            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <div className="icon-x text-lg"></div>
                            {responding ? 'Processing...' : 'Decline Task'}
                        </button>
                        <button
                            onClick={() => handleResponse('request_clarification')}
                            disabled={responding}
                            className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <div className="icon-message-circle text-lg"></div>
                            {responding ? 'Processing...' : 'Request Info'}
                        </button>
                    </div>
                </div>

                {/* Help Text */}
                <div className="mt-6 text-center text-sm text-gray-600">
                    <p>Questions about this task? Contact your event organizer directly.</p>
                </div>
            </div>
        </div>
    );
}

window.TaskAssignmentResponse = TaskAssignmentResponse;
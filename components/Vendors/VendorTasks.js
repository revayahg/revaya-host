function VendorTasks({ eventId, vendorId }) {
    try {
        const [tasks, setTasks] = React.useState([]);
        const [loading, setLoading] = React.useState(true);
        const [error, setError] = React.useState(null);
        const [filter, setFilter] = React.useState('all');
        const [updatingStatus, setUpdatingStatus] = React.useState(null);

        React.useEffect(() => {
            const fetchTasks = async () => {
                try {
                    setLoading(true);
                    const vendorTasks = await window.TaskAPI.getVendorTasks(vendorId, eventId);
                    setTasks(vendorTasks || []);
                } catch (err) {
                    setError('Failed to load tasks');
                    reportError(err);
                } finally {
                    setLoading(false);
                }
            };

            if (eventId && vendorId) {
                fetchTasks();
            }
        }, [eventId, vendorId]);

        const handleStatusChange = async (taskId, newStatus) => {
            try {
                setUpdatingStatus(taskId);
                
                // Get current user ID for notifications
                const { data: { user } } = await window.supabaseClient.auth.getUser();
                await window.TaskAPI.updateTaskStatus(taskId, newStatus, user?.id);
                
                // Update local state
                setTasks(prevTasks => 
                    prevTasks.map(task => 
                        task.id === taskId 
                            ? { ...task, status: newStatus }
                            : task
                    )
                );
                
                window.toast?.success('Task status updated!');
            } catch (err) {
                window.toast?.error('Failed to update task status');
                reportError(err);
            } finally {
                setUpdatingStatus(null);
            }
        };

        const filteredTasks = tasks.filter(task => {
            if (filter === 'all') return true;
            if (filter === 'todo') return task.status === 'pending';
            return task.status === filter;
        });

        const getStatusColor = (status) => {
            switch (status?.toLowerCase()) {
                case 'completed':
                    return 'bg-green-100 text-green-800';
                case 'in-progress':
                    return 'bg-blue-100 text-blue-800';
                case 'pending':
                default:
                    return 'bg-yellow-100 text-yellow-800';
            }
        };

        if (loading) {
            return (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded">
                    {error}
                </div>
            );
        }

        return (
            <div data-name="vendor-tasks" className="space-y-6 bg-white rounded-lg p-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">My Event Tasks</h2>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1 rounded-full text-sm ${
                                filter === 'all' ? 'bg-indigo-100 text-indigo-800' : 'text-gray-600'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('todo')}
                            className={`px-3 py-1 rounded-full text-sm ${
                                filter === 'todo' ? 'bg-indigo-100 text-indigo-800' : 'text-gray-600'
                            }`}
                        >
                            To Do
                        </button>
                        <button
                            onClick={() => setFilter('completed')}
                            className={`px-3 py-1 rounded-full text-sm ${
                                filter === 'completed' ? 'bg-indigo-100 text-indigo-800' : 'text-gray-600'
                            }`}
                        >
                            Completed
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {filteredTasks.map(task => (
                        <div
                            key={task.id}
                            className="bg-gray-50 rounded-lg border border-gray-200 p-4"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="font-medium">{task.title}</h3>
                                    <p className="text-gray-600 text-sm mt-1">{task.description}</p>
                                    <div className="flex items-center text-sm text-gray-500 mt-2">
                                        <i className="fas fa-calendar-alt mr-1"></i>
                                        <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</span>
                                    </div>
                                </div>
                                <select
                                    value={task.status || 'pending'}
                                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                    disabled={updatingStatus === task.id}
                                    className={`text-xs px-2 py-1 rounded-full border-0 font-medium ${getStatusColor(task.status)} ${
                                        updatingStatus === task.id ? 'opacity-50' : 'cursor-pointer hover:opacity-75'
                                    }`}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="in-progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                        </div>
                    ))}

                    {filteredTasks.length === 0 && (
                        <div className="text-center py-8">
                            <div className="text-gray-400 mb-2">
                                <i className="fas fa-tasks text-4xl"></i>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No tasks found</h3>
                            <p className="text-gray-500">
                                {filter === 'all' 
                                    ? 'No tasks have been assigned to you yet'
                                    : `No ${filter} tasks available`}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    } catch (error) {
        reportError(error);
        return null;
    }
}

window.VendorTasks = VendorTasks;

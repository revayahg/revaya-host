function TaskManager({ eventId, event, tasks, onTasksChange }) {
    try {
        const [showAddForm, setShowAddForm] = React.useState(false);
        const [editingTask, setEditingTask] = React.useState(null);
        const [saving, setSaving] = React.useState(false);
        const [localTasks, setLocalTasks] = React.useState([]);
        const [loading, setLoading] = React.useState(true);
        const [filters, setFilters] = React.useState({
            priority: '',
            sortBy: 'created_at'
        });

        // Get clean event ID
        const currentEventId = React.useMemo(() => {
            const id = eventId || event?.id;
            if (!id) return null;
            
            let cleaned = id.toString();
            if (cleaned.endsWith('/edit')) {
                cleaned = cleaned.replace('/edit', '');
            }
            cleaned = cleaned.split('?')[0];
            
            return cleaned;
        }, [eventId, event?.id]);

        // Load tasks once on mount
        React.useEffect(() => {
            if (currentEventId) {
                loadTasks();
            }
        }, [currentEventId]);

        // Prevent form closure on visibility change
        React.useEffect(() => {
            const handleVisibilityChange = (e) => {
                // Prevent default browser behavior that might close modals
                e.preventDefault();
                e.stopPropagation();
            };

            document.addEventListener('visibilitychange', handleVisibilityChange, true);
            return () => {
                document.removeEventListener('visibilitychange', handleVisibilityChange, true);
            };
        }, []);

        const loadTasks = async () => {
            try {
                setLoading(true);
                const fetchedTasks = await window.TaskAPI.getEventTasks(currentEventId);
                setLocalTasks(fetchedTasks || []);
            } catch (error) {
                window.showToast('Failed to load tasks', 'error');
            } finally {
                setLoading(false);
            }
        };

        const getFilteredTasks = () => {
            let filteredTasks = [...localTasks];

            if (filters.priority) {
                filteredTasks = filteredTasks.filter(task => task.priority === filters.priority);
            }



            // Sort tasks
            filteredTasks.sort((a, b) => {
                switch (filters.sortBy) {
                    case 'priority':
                        const priorityOrder = { high: 3, medium: 2, low: 1 };
                        return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
                    case 'title':
                        return (a.title || '').localeCompare(b.title || '');
                    case 'due_date':
                        const getDateValue = (dueDate) => {
                            return window.DateUtils ? 
                                window.DateUtils.getSafeDateForSorting(dueDate) : 
                                new Date('9999-12-31');
                        };
                        return getDateValue(a.due_date) - getDateValue(b.due_date);
                    default:
                        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                }
            });

            return filteredTasks;
        };

        const getTasksByStatus = () => {
            const filteredTasks = getFilteredTasks();
            return {
                pending: filteredTasks.filter(task => task.status === 'pending' || !task.status),
                in_progress: filteredTasks.filter(task => task.status === 'in_progress'),
                completed: filteredTasks.filter(task => task.status === 'completed')
            };
        };

        const handleSaveTask = async () => {
            // Close form and reload tasks
            setShowAddForm(false);
            setEditingTask(null);
            await loadTasks();
        };

        if (loading) {
            return (
                <div className="bg-white rounded-lg shadow-sm p-6" data-name="task-manager" data-file="components/Events/TaskManager.js">
                    <div className="flex items-center justify-center py-8">
                        <i className="fas fa-spinner fa-spin text-2xl text-indigo-600 mr-3"></i>
                        <span className="text-gray-600">Loading tasks...</span>
                    </div>
                </div>
            );
        }

        const tasksByStatus = getTasksByStatus();

        return (
            <div className="bg-white rounded-lg shadow-sm p-6" data-name="task-manager" data-file="components/Events/TaskManager.js">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
                    <h2 className="text-lg sm:text-xl font-semibold flex items-center justify-center sm:justify-start">
                        <i className="fas fa-tasks mr-2 text-indigo-600"></i>
                        <span className="hidden sm:inline">Task Management ({localTasks?.length || 0})</span>
                        <span className="sm:hidden">Tasks ({localTasks?.length || 0})</span>
                    </h2>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-3 py-2 sm:px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm sm:text-base flex items-center justify-center w-full sm:w-auto"
                        disabled={saving}
                    >
                        <i className="fas fa-plus mr-2"></i>
                        Add Task
                    </button>
                </div>

                {/* Improved Filters and Sorting Section */}
                <div className="mb-6 space-y-4">
                    {/* Filters Section */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center mb-3">
                            <i className="fas fa-filter text-blue-600 mr-2"></i>
                            <h3 className="text-sm font-semibold text-blue-800">Filter Tasks</h3>
                            {filters.priority && (
                                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                    {filters.priority.charAt(0).toUpperCase() + filters.priority.slice(1)} Priority
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center space-x-2">
                                <label className="text-sm font-medium text-gray-700">Show only:</label>
                                <select
                                    value={filters.priority}
                                    onChange={(e) => setFilters(prev => ({...prev, priority: e.target.value}))}
                                    className="text-sm border border-gray-300 rounded px-3 py-2 bg-white"
                                >
                                    <option value="">All Priorities</option>
                                    <option value="high">🔴 High Priority Only</option>
                                    <option value="medium">🟡 Medium Priority Only</option>
                                    <option value="low">🟢 Low Priority Only</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Sorting Section */}
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center mb-3">
                            <i className="fas fa-sort text-green-600 mr-2"></i>
                            <h3 className="text-sm font-semibold text-green-800">Sort Tasks</h3>
                            <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                {filters.sortBy === 'created_at' && 'Newest First'}
                                {filters.sortBy === 'priority' && 'Priority Order'}
                                {filters.sortBy === 'title' && 'Alphabetical'}
                                {filters.sortBy === 'due_date' && 'Due Date'}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center space-x-2">
                                <label className="text-sm font-medium text-gray-700">Order by:</label>
                                <select
                                    value={filters.sortBy}
                                    onChange={(e) => setFilters(prev => ({...prev, sortBy: e.target.value}))}
                                    className="text-sm border border-gray-300 rounded px-3 py-2 bg-white"
                                >
                                    <option value="created_at">📅 Created Date (Newest First)</option>
                                    <option value="priority">⚡ Priority (High → Low)</option>
                                    <option value="title">🔤 Title (A → Z)</option>
                                    <option value="due_date">📆 Due Date (Soonest First)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Clear Filters Button */}
                    {(filters.priority || filters.sortBy !== 'created_at') && (
                        <div className="flex justify-end">
                            <button
                                onClick={() => setFilters({ priority: '', sortBy: 'created_at' })}
                                className="text-sm text-gray-600 hover:text-gray-800 underline"
                            >
                                <i className="fas fa-times mr-1"></i>
                                Clear all filters & sorting
                            </button>
                        </div>
                    )}
                </div>

                {showAddForm && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <window.EditTaskForm
                            task={editingTask}
                            eventId={currentEventId}
                            onSave={handleSaveTask}
                            onCancel={() => {
                                setShowAddForm(false);
                                setEditingTask(null);
                            }}
                            saving={saving}
                        />
                    </div>
                )}

                <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-6">
                    <window.KanbanColumn 
                        title="Pending" 
                        status="pending"
                        tasks={tasksByStatus.pending}
                        onEdit={(task) => {
                            setEditingTask(task);
                            setShowAddForm(true);
                        }}
                        onTasksChange={loadTasks}
                        color="border-yellow-200 bg-yellow-50"
                        eventId={currentEventId}
                    />
                    <window.KanbanColumn 
                        title="In Progress" 
                        status="in_progress"
                        tasks={tasksByStatus.in_progress}
                        onEdit={(task) => {
                            setEditingTask(task);
                            setShowAddForm(true);
                        }}
                        onTasksChange={loadTasks}
                        color="border-blue-200 bg-blue-50"
                        eventId={currentEventId}
                    />
                    <window.KanbanColumn 
                        title="Completed" 
                        status="completed"
                        tasks={tasksByStatus.completed}
                        onEdit={(task) => {
                            setEditingTask(task);
                            setShowAddForm(true);
                        }}
                        onTasksChange={loadTasks}
                        color="border-green-200 bg-green-50"
                        eventId={currentEventId}
                    />
                </div>
            </div>
        );
    } catch (error) {
        return null;
    }
}

window.TaskManager = TaskManager;
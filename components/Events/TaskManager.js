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
        const [showAIUploader, setShowAIUploader] = React.useState(false);
        const [showSuggestionsModal, setShowSuggestionsModal] = React.useState(false);
        const [aiSuggestions, setAiSuggestions] = React.useState([]);
        const [currentDocumentName, setCurrentDocumentName] = React.useState('');

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
                not_started: filteredTasks.filter(task => task.status === 'not_started' || !task.status),
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

        const handleTaskMove = async (taskId, newStatus) => {
            try {
                const { data: { user } } = await window.supabaseClient.auth.getUser();
                await window.TaskAPI.updateTaskStatus(taskId, newStatus, user?.id);
                await loadTasks();
            } catch (error) {
                throw error;
            }
        };

        const handleAIUploadComplete = (document, suggestions) => {
            setCurrentDocumentName(document.file_name);
            setAiSuggestions(suggestions);
            setShowSuggestionsModal(true);
            setShowAIUploader(false);
        };

        const handleAIUploadError = (error) => {
            console.error('AI upload error:', error);
            window.showToast('AI upload failed: ' + error.message, 'error');
        };

        const handleCreateAITasks = async (tasksToCreate) => {
            try {
                const { data: { user } } = await window.supabaseClient.auth.getUser();
                
                // Create tasks one by one
                for (const taskData of tasksToCreate) {
                    await window.TaskAPI.createTask({
                        ...taskData,
                        event_id: currentEventId,
                        assigned_to: user.id,
                        assigned_to_type: 'user'
                    });
                }
                
                // Reload tasks to show the new ones
                await loadTasks();
                
            } catch (error) {
                console.error('Create AI tasks error:', error);
                throw error;
            }
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
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => setShowAIUploader(!showAIUploader)}
                            className="px-3 py-2 sm:px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm sm:text-base flex items-center justify-center w-full sm:w-auto"
                            disabled={saving}
                        >
                            <i className="fas fa-robot mr-2"></i>
                            Create tasks using AI!
                        </button>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-3 py-2 sm:px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm sm:text-base flex items-center justify-center w-full sm:w-auto"
                        disabled={saving}
                    >
                        <i className="fas fa-plus mr-2"></i>
                        Add Task
                    </button>
                    </div>
                </div>

                {/* Improved Filters and Sorting Section */}
                <div className="mb-6">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            {/* Filter Tasks */}
                            <div className="flex items-center space-x-2 flex-1">
                                <i className="fas fa-filter text-indigo-600"></i>
                                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Filter:</label>
                                <select
                                    value={filters.priority}
                                    onChange={(e) => setFilters(prev => ({...prev, priority: e.target.value}))}
                                    className="text-sm border border-gray-300 rounded px-3 py-2 bg-white flex-1 min-w-0"
                                >
                                    <option value="">All Priorities</option>
                                    <option value="high">🔴 High Priority Only</option>
                                    <option value="medium">🟡 Medium Priority Only</option>
                                    <option value="low">🟢 Low Priority Only</option>
                                </select>
                            </div>

                            {/* Sort Tasks */}
                            <div className="flex items-center space-x-2 flex-1">
                                <i className="fas fa-sort text-indigo-600"></i>
                                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort:</label>
                                <select
                                    value={filters.sortBy}
                                    onChange={(e) => setFilters(prev => ({...prev, sortBy: e.target.value}))}
                                    className="text-sm border border-gray-300 rounded px-3 py-2 bg-white flex-1 min-w-0"
                                >
                                    <option value="created_at">📅 Created Date (Newest First)</option>
                                    <option value="priority">⚡ Priority (High → Low)</option>
                                    <option value="title">🔤 Title (A → Z)</option>
                                    <option value="due_date">📆 Due Date (Soonest First)</option>
                                </select>
                            </div>
                        </div>

                        {/* Clear Filters Button */}
                        {(filters.priority || filters.sortBy !== 'created_at') && (
                            <div className="flex justify-end mt-3 pt-3 border-t border-gray-300">
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

                {showAIUploader && (
                    <div className="bg-purple-50 rounded-lg p-4 mb-6 border border-purple-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-purple-800 flex items-center">
                                <i className="fas fa-robot mr-2"></i>
                                AI Document Analysis
                            </h3>
                            <button
                                onClick={() => setShowAIUploader(false)}
                                className="text-purple-600 hover:text-purple-800 transition-colors"
                            >
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <window.AIDocumentUploader
                            eventId={currentEventId}
                            onUploadComplete={handleAIUploadComplete}
                            onError={handleAIUploadError}
                        />
                    </div>
                )}

                <window.AITaskSuggestionsModal
                    isOpen={showSuggestionsModal}
                    onClose={() => setShowSuggestionsModal(false)}
                    suggestions={aiSuggestions}
                    onCreateTasks={handleCreateAITasks}
                    documentName={currentDocumentName}
                    eventId={currentEventId}
                />

                <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-6">
                    <window.KanbanColumn 
                        title="Not Started" 
                        status="not_started"
                        tasks={tasksByStatus.not_started}
                        onEdit={(task) => {
                            setEditingTask(task);
                            setShowAddForm(true);
                        }}
                        onTasksChange={loadTasks}
                        onTaskMove={handleTaskMove}
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
                        onTaskMove={handleTaskMove}
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
                        onTaskMove={handleTaskMove}
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
function TaskManager({ eventId, event, tasks, onTasksChange }) {
    try {
        const [showAddForm, setShowAddForm] = React.useState(false);
        const [editingTask, setEditingTask] = React.useState(null);
        const [saving, setSaving] = React.useState(false);
        const [localTasks, setLocalTasks] = React.useState([]);
        const [loading, setLoading] = React.useState(true);
        const [view, setView] = React.useState('kanban');
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

        const getTimelineGroups = () => {
            const tasks = getFilteredTasks();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
            const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);
            const nextWeekEnd = new Date(today); nextWeekEnd.setDate(today.getDate() + 14);

            const groups = [
                { key: 'overdue', label: 'Overdue', icon: 'fas fa-exclamation-circle', color: 'text-red-600', bg: 'bg-red-50 border-red-200', tasks: [] },
                { key: 'today', label: 'Today', icon: 'fas fa-circle-dot', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', tasks: [] },
                { key: 'this_week', label: 'This Week', icon: 'fas fa-calendar-week', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', tasks: [] },
                { key: 'next_week', label: 'Next Week', icon: 'fas fa-calendar', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', tasks: [] },
                { key: 'later', label: 'Later', icon: 'fas fa-hourglass-half', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', tasks: [] },
                { key: 'no_date', label: 'No Due Date', icon: 'fas fa-minus-circle', color: 'text-gray-400', bg: 'bg-gray-50 border-gray-100', tasks: [] },
            ];

            tasks.forEach(task => {
                if (!task.due_date) {
                    groups[5].tasks.push(task);
                    return;
                }
                const d = new Date(task.due_date);
                d.setHours(0, 0, 0, 0);
                if (d < today) groups[0].tasks.push(task);
                else if (d < tomorrow) groups[1].tasks.push(task);
                else if (d < weekEnd) groups[2].tasks.push(task);
                else if (d < nextWeekEnd) groups[3].tasks.push(task);
                else groups[4].tasks.push(task);
            });

            return groups;
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
                        {/* View toggle */}
                        <div className="flex rounded-lg border border-gray-300 overflow-hidden self-center sm:self-auto">
                            <button
                                onClick={() => setView('kanban')}
                                className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${view === 'kanban' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                title="Kanban view"
                            >
                                <i className="fas fa-columns"></i>
                                <span className="hidden sm:inline">Kanban</span>
                            </button>
                            <button
                                onClick={() => setView('timeline')}
                                className={`px-3 py-2 text-sm flex items-center gap-1.5 border-l border-gray-300 transition-colors ${view === 'timeline' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                title="Timeline view"
                            >
                                <i className="fas fa-timeline"></i>
                                <span className="hidden sm:inline">Timeline</span>
                            </button>
                        </div>
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

                {view === 'kanban' ? (
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
                ) : (
                    <div className="space-y-4">
                        {getTimelineGroups().map(group => (
                            group.tasks.length === 0 ? null : (
                                <div key={group.key} className={`rounded-lg border p-4 ${group.bg}`}>
                                    <div className={`flex items-center gap-2 mb-3 font-semibold ${group.color}`}>
                                        <i className={group.icon}></i>
                                        <span>{group.label}</span>
                                        <span className="ml-auto text-sm font-normal opacity-70">{group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {group.tasks.map(task => {
                                            const statusColors = { completed: 'bg-green-100 text-green-700', in_progress: 'bg-blue-100 text-blue-700', not_started: 'bg-yellow-100 text-yellow-700' };
                                            const priorityDots = { high: 'bg-red-500', medium: 'bg-yellow-400', low: 'bg-green-400' };
                                            const statusLabel = { completed: 'Completed', in_progress: 'In Progress', not_started: 'Not Started' };
                                            const status = task.status || 'not_started';
                                            return (
                                                <div key={task.id} className="bg-white rounded-md border border-gray-200 px-4 py-3 flex items-start justify-between gap-3 hover:shadow-sm transition-shadow">
                                                    <div className="flex items-start gap-3 min-w-0">
                                                        <span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${priorityDots[task.priority] || priorityDots.medium}`} title={`${task.priority || 'medium'} priority`}></span>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-gray-900 truncate">{task.title}</p>
                                                            {(task.start_date || task.due_date) && (
                                                                <p className="text-xs text-gray-500 mt-0.5">
                                                                    {task.start_date && <span>Start: {new Date(task.start_date).toLocaleDateString()}</span>}
                                                                    {task.start_date && task.due_date && <span className="mx-1">→</span>}
                                                                    {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[status] || statusColors.not_started}`}>
                                                            {statusLabel[status] || 'Not Started'}
                                                        </span>
                                                        <button
                                                            onClick={() => { setEditingTask(task); setShowAddForm(true); }}
                                                            className="text-gray-400 hover:text-indigo-600 transition-colors"
                                                            title="Edit task"
                                                        >
                                                            <i className="fas fa-pencil text-sm"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )
                        ))}
                        {getFilteredTasks().length === 0 && (
                            <div className="text-center py-10 text-gray-400">
                                <i className="fas fa-calendar-xmark text-3xl mb-2"></i>
                                <p>No tasks yet</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    } catch (error) {
        return null;
    }
}

window.TaskManager = TaskManager;
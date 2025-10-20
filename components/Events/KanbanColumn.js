function KanbanColumn({ title, status, tasks, onEdit, onTasksChange, color, eventId }) {
    const [collaborators, setCollaborators] = React.useState([]);
    
    // Load collaborators for assignee display
    React.useEffect(() => {
        const loadCollabs = async () => {
            try {
                if (window.collaboratorAPI && eventId) {
                    const rows = await window.collaboratorAPI.getAllCollaboratorsForTaskAssignment(eventId);
                    setCollaborators(rows || []);
                }
            } catch (e) {
                setCollaborators([]);
            }
        };
        loadCollabs();
    }, [eventId]);

        // Helper function to get assignee label with proper collaborator lookup
        const getAssigneeLabel = (task) => {
            if (!task?.assigned_to) return null;
            
            // Use assigned_label if available and meaningful (not a UUID)
            if (task.assigned_label && task.assigned_label !== task.assigned_to) {
                return task.assigned_label;
            }
            
            // If assigned_to is an email, show it
            if (task.assigned_to.includes('@')) {
                return task.assigned_to;
            }
            
            // If assigned_to is a UUID, try to find the collaborator name
            if (task.assigned_to.length === 36) {
                // Look up in collaborators (handle both user_id and id fields)
                const collaborator = collaborators.find(collab => 
                    (collab.user_id === task.assigned_to) || (collab.id === task.assigned_to)
                );
                if (collaborator) {
                    return collaborator.displayName || collaborator.email;
                }
                
                // If no collaborator found, show partial UUID
                return `User ${task.assigned_to.slice(0, 8)}...`;
            }
            
            // Fallback: show the assigned_to value if it's not a UUID
            if (task.assigned_to.length < 36) {
                return task.assigned_to;
            }
            
            return null;
        };
    
    try {
        const getPriorityColor = (priority) => {
            switch (priority) {
                case 'high': return 'bg-red-100 text-red-800 border-red-200';
                case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                case 'low': return 'bg-green-100 text-green-800 border-green-200';
                default: return 'bg-gray-100 text-gray-800 border-gray-200';
            }
        };

        const handleStatusChange = async (taskId, newStatus) => {
            try {
                // Get current user ID for notifications
                const { data: { user } } = await window.supabaseClient.auth.getUser();
                await window.TaskAPI.updateTaskStatus(taskId, newStatus, user?.id);
                // Reload from API so each task has assigned_label
                if (typeof onTasksChange === 'function') onTasksChange();
                window.showToast('Task status updated', 'success');
            } catch (error) {
                window.showToast('Failed to update task status', 'error');
            }
        };

        const handleDeleteTask = async (taskId) => {
            if (confirm('Are you sure you want to delete this task?')) {
                try {
                    await window.TaskAPI.deleteTask(taskId);
                    onTasksChange();
                    window.showToast('Task deleted successfully', 'success');
                } catch (error) {
                    window.showToast('Failed to delete task', 'error');
                }
            }
        };

        return (
            <div className={`rounded-lg border-2 ${color} p-3 sm:p-4`} data-name="kanban-column" data-file="components/Events/KanbanColumn.js">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                    <span className="bg-white text-gray-600 text-xs px-2 py-1 rounded-full">
                        {tasks.length}
                    </span>
                </div>

                <div className="space-y-3 min-h-[200px]">
                    {tasks.map(task => (
                        <div key={task.id} className="bg-white rounded-lg p-3 sm:p-4 border shadow-sm hover:shadow-md transition-shadow mobile-card">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-gray-900 flex-1 mr-2">
                                    {task.title || 'Untitled Task'}
                                </h4>
                                <div className="flex space-x-1">
                                    <button
                                        onClick={() => onEdit(task)}
                                        className="text-gray-400 hover:text-indigo-600 transition-colors"
                                    >
                                        <i className="fas fa-edit text-sm"></i>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                    >
                                        <i className="fas fa-trash text-sm"></i>
                                    </button>
                                </div>
                            </div>

                            {task.description && (
                                <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                                    {task.description}
                                </p>
                            )}

                            <div className="flex flex-wrap gap-2 mb-3">
                                <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(task.priority)}`}>
                                    {(task.priority || 'medium').charAt(0).toUpperCase() + (task.priority || 'medium').slice(1)}
                                </span>
                            </div>

                            {task.due_date && (
                                <div className="text-xs text-gray-500 mb-3">
                                    Due: {new Date(task.due_date + 'T00:00:00').toLocaleDateString()}
                                </div>
                            )}

                            {getAssigneeLabel(task) && (
                                <div className="mt-2 flex items-center text-sm text-gray-600 mb-1 sm:mb-2">
                                    <div className="icon-user text-xs mr-1"></div>
                                    <span>{getAssigneeLabel(task)}</span>
                                </div>
                            )}

                            <select
                                value={task.status || 'pending'}
                                onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                className="mt-1 sm:mt-2 text-xs border border-gray-300 rounded px-2 py-1 bg-white w-full"
                            >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                    ))}

                    {tasks.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <i className="fas fa-inbox text-2xl mb-2 block"></i>
                            <p className="text-sm">No {title.toLowerCase()} tasks</p>
                        </div>
                    )}
                </div>
            </div>
        );
    } catch (error) {
        return null;
    }
}

window.KanbanColumn = KanbanColumn;
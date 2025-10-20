function TaskList({ tasks, onEdit, assignedVendors = [], onTasksChange, eventId, canEdit = false }) {
    try {
        const taskArray = React.useMemo(() => {
            return Array.isArray(tasks) ? tasks : [];
        }, [tasks]);

        const [updatingStatus, setUpdatingStatus] = React.useState(null);
        const [deletingTask, setDeletingTask] = React.useState(null);
        const [localTasks, setLocalTasks] = React.useState(taskArray);
        const [vendorProfiles, setVendorProfiles] = React.useState({});
        const [collaborators, setCollaborators] = React.useState([]);
        const [assigneeNames, setAssigneeNames] = React.useState({});

        // Update local tasks when props change
        React.useEffect(() => {
            setLocalTasks(taskArray);
        }, [taskArray]);

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

        // Load assignee names for user_id assignments
        React.useEffect(() => {
            const loadAssigneeNames = async () => {
                if (!eventId || !taskArray.length) return;

                // Get all UUIDs from assigned_to (since assigned_to_type doesn't exist)
                const userIds = [...new Set(
                    taskArray
                        .filter(task => task.assigned_to && task.assigned_to.length === 36)
                        .map(task => task.assigned_to)
                )];

                if (userIds.length === 0) {
                    setAssigneeNames({});
                    return;
                }

                try {
                    const nameMap = {};

                    if (window.collaboratorAPI?.getAllCollaboratorsForTaskAssignment) {
                        const collaborators = await window.collaboratorAPI.getAllCollaboratorsForTaskAssignment(eventId);
                        collaborators.forEach(collab => {
                            if (collab.user_id && userIds.includes(collab.user_id)) {
                                nameMap[collab.user_id] = collab.displayName || collab.email;
                            }
                        });
                    }

                    const unresolvedIds = userIds.filter(id => !nameMap[id]);
                    if (unresolvedIds.length > 0) {
                        const { data: profiles } = await window.supabaseClient
                            .from('profiles')
                            .select('id, first_name, last_name, email')
                            .in('id', unresolvedIds);

                        if (profiles) {
                            profiles.forEach(profile => {
                                const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
                                nameMap[profile.id] = name || profile.email;
                            });
                        }
                    }

                    setAssigneeNames(nameMap);
                } catch (error) {
                    setAssigneeNames({});
                }
            };

            loadAssigneeNames();
        }, [taskArray, eventId]);

        // Use the same vendor loading approach as TaskManager
        React.useEffect(() => {
            const loadAssignedVendors = async () => {
                if (!taskArray.length) return;
                
                const vendorIds = taskArray
                    .filter(task => task.assignee_vendor_id)
                    .map(task => task.assignee_vendor_id)
                    .filter(id => id);
                
                if (vendorIds.length === 0) return;

                try {
                    
                    const { data: invitations, error } = await window.supabaseClient
                        .from('event_invitations')
                        .select(`
                            vendor_profile_id,
                            response,
                            vendor_profiles (
                                id,
                                name,
                                company,
                                email
                            )
                        `)
                        .in('vendor_profile_id', vendorIds);


                    if (error) {
                        return;
                    }

                    if (invitations && invitations.length > 0) {
                        const vendorMap = {};
                        invitations.forEach(invitation => {
                            const profile = invitation.vendor_profiles;
                            if (profile) {
                                vendorMap[invitation.vendor_profile_id] = {
                                    vendorProfileId: invitation.vendor_profile_id,
                                    name: profile.company || profile.name || 'Unknown Vendor',
                                    email: profile.email || '',
                                    status: invitation.response || 'pending'
                                };
                            }
                        });
                        setVendorProfiles(vendorMap);
                    } else {
                        setVendorProfiles({});
                    }
                } catch (error) {
                    setVendorProfiles({});
                }
            };

            loadAssignedVendors();
        }, [taskArray]);

        const formatDate = (dateStr) => {
            if (!dateStr) return 'No due date';
            try {
                // Add time to prevent timezone offset issues
                return new Date(dateStr + 'T00:00:00').toLocaleDateString();
            } catch {
                return dateStr;
            }
        };

        // Helper to get assignee label with proper collaborator lookup
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
                // Look up in assigneeNames (for user_id assignments)
                if (assigneeNames[task.assigned_to]) {
                    return assigneeNames[task.assigned_to];
                }
                
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

        const handleStatusChange = async (taskId, newStatus) => {
            // Allow status updates if:
            // 1. User has edit permissions (canEdit = true), OR
            // 2. User is a viewer but the task is assigned to them
            const task = localTasks.find(t => t.id === taskId);
            
            // Get current user ID
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            const isAssignedToCurrentUser = task && task.assigned_to && task.assigned_to === user?.id;
            
            if (!canEdit && !isAssignedToCurrentUser) {
                return;
            }
            
            try {
                setUpdatingStatus(taskId);
                
                // Optimistically update the local state immediately
                setLocalTasks(prevTasks => 
                    prevTasks.map(task => 
                        task.id === taskId 
                            ? { ...task, status: newStatus }
                            : task
                    )
                );

                // Update in the database with current user ID for notifications
                await window.TaskAPI.updateTaskStatus(taskId, newStatus, user?.id);
                window.toast?.success('Task status updated!');
                
                // Reload from API so each task has assigned_label
                if (typeof onTasksChange === 'function') onTasksChange();
                
            } catch (error) {
                window.toast?.error('Failed to update task status');
                
                // Revert the optimistic update on error
                setLocalTasks(taskArray);
                reportError(error);
            } finally {
                setUpdatingStatus(null);
            }
        };

        const handleDeleteTask = async (task) => {
            if (!canEdit) return;
            
            if (!confirm(`Are you sure you want to delete the task "${task.title}"?`)) {
                return;
            }

            try {
                setDeletingTask(task.id);
                
                await window.TaskAPI.deleteTask(task.id);
                
                // Remove task from local state immediately
                setLocalTasks(prevTasks => prevTasks.filter(t => t.id !== task.id));
                
                // Trigger reload of tasks from parent
                if (typeof onTasksChange === 'function') {
                    onTasksChange();
                }
                
                window.toast?.success('Task deleted successfully!');
            } catch (error) {
                window.toast?.error(`Error deleting task: ${error.message}`);
            } finally {
                setDeletingTask(null);
            }
        };

        const getStatusColor = (status) => {
            switch (status?.toLowerCase()) {
                case 'complete':
                case 'completed':
                    return 'bg-green-100 text-green-800';
                case 'in progress':
                case 'in-progress':
                    return 'bg-blue-100 text-blue-800';
                case 'pending':
                default:
                    return 'bg-yellow-100 text-yellow-800';
            }
        };

        return (
            <div data-name="task-list" data-section="tasks" data-file="components/Events/TaskList.js" className="space-y-4">
                {localTasks.map(task => (
                    <div 
                        key={task.id}
                        data-name="task-item"
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                        {/* Mobile-first responsive layout */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                            <div className="flex-1">
                                <h4 className="text-gray-700 font-medium mb-2 text-base sm:text-sm">
                                    {task.title || 'Untitled Task'}
                                </h4>
                                {task.description && (
                                    <div className="text-sm text-gray-600 leading-relaxed">
                                        {task.description}
                                    </div>
                                )}
                            </div>
                            
                            {/* Mobile-optimized action buttons */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2">
                                <select
                                    value={task.status || 'pending'}
                                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                    disabled={updatingStatus === task.id}
                                    className={`text-sm px-3 py-2 rounded-full border-0 font-medium min-h-[44px] sm:min-h-[32px] sm:text-xs sm:px-2 sm:py-1 ${getStatusColor(task.status)} ${
                                        updatingStatus === task.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-75'
                                    }`}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="in-progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                </select>
                                
                                <div className="flex gap-2">
                                    {canEdit && onEdit && (
                                        <button
                                            onClick={() => onEdit(task)}
                                            className="px-3 py-2 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200 flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:px-2 sm:py-1 sm:text-xs touch-target"
                                            disabled={deletingTask === task.id}
                                        >
                                            <i className="fas fa-edit sm:mr-1"></i>
                                            <span className="hidden sm:inline ml-1">Edit</span>
                                        </button>
                                    )}
                                    {canEdit && (
                                        <button
                                            onClick={() => handleDeleteTask(task)}
                                            disabled={deletingTask === task.id}
                                            className="px-3 py-2 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200 flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:px-2 sm:py-1 sm:text-xs disabled:opacity-50 touch-target"
                                        >
                                            {deletingTask === task.id ? (
                                                <i className="fas fa-spinner fa-spin sm:mr-1"></i>
                                            ) : (
                                                <i className="fas fa-trash sm:mr-1"></i>
                                            )}
                                            <span className="hidden sm:inline ml-1">Delete</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                            <div>Due: <span className="font-medium">{formatDate(task.due_date)}</span></div>
                            {getAssigneeLabel(task) && (
                                <div className="flex items-center mb-2">
                                    <div className="icon-user text-xs mr-1"></div>
                                    <span className="truncate">Assigned: {getAssigneeLabel(task)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {localTasks.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-gray-500 text-sm">No tasks yet. Click "Add Task" to get started!</div>
                    </div>
                )}
            </div>
        );
    } catch (error) {
        reportError(error);
        return null;
    }
}

window.TaskList = TaskList;
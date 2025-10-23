// EditTaskForm - Updated 2025-01-04 - Added X button to close task form
function EditTaskForm({ task, eventId, onSave, onCancel, vendorProfiles = [] }) {
    const [formData, setFormData] = React.useState({
        title: task?.title || '',
        description: task?.description || '',
        priority: task?.priority || 'medium',
        status: task?.status || 'pending',
        due_date: window.DateUtils ? window.DateUtils.dbToInputDate(task?.due_date) : (task?.due_date || ''),
        assigned_to: task?.assigned_to || '',
        assigned_to_type: task?.assigned_to_type || 'free_text'
    });

    const [allCollaborators, setAllCollaborators] = React.useState([]);
    const [showCollaboratorDropdown, setShowCollaboratorDropdown] = React.useState(false);
    const [inputValue, setInputValue] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [errors, setErrors] = React.useState({});

    // --- helpers for ids, names, types ---
    const isUUID = (s) => typeof s === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

    const isEmail = (s) => typeof s === 'string' && /\S+@\S+\.\S+/.test(s);

    // Normalize assorted collaborator shapes into a single user id
    const getUserId = (c) =>
      c?.user_id || c?.userId || c?.id || c?.profile_id || c?.profileId || null;

    // Prefer a human name if available; otherwise fall back to email
    const formatCollaboratorForDisplay = (c = {}) => {
      const clean = (v) => (typeof v === 'string' ? v.trim() : '');
      const notEmpty = (v) => v && v.toUpperCase() !== 'EMPTY';

      const email = clean(c.email);
      const first = clean(c.first_name || c.firstName || c?.profile?.first_name || c?.profile?.firstName);
      const last  = clean(c.last_name  || c.lastName  || c?.profile?.last_name  || c?.profile?.lastName);
      const parts  = [first, last].filter(Boolean).join(' ').trim();
      const display = clean(
        c.displayName || c.display_name || c.full_name || c.fullName ||
        c?.profile?.display_name || c?.profile?.full_name
      );

      const candidates = [display, parts, first, last, clean(c.name)];
      let name = '';
      for (const cand of candidates) {
        if (!notEmpty(cand)) continue;
        if (isEmail(cand))   continue;
        name = cand;
        break;
      }

      if ((c.status || '').toLowerCase() === 'pending') return email || name || 'Unknown';
      if (name && email) return `${name} (${email})`;
      return name || email || 'Unknown';
    };

    // Helper function for consistent label selection
    const labelFrom = (obj = {}) => {
        if (obj.displayName) return obj.displayName;
        const fn = obj.first_name && obj.first_name !== 'EMPTY' ? obj.first_name : '';
        const ln = obj.last_name && obj.last_name !== 'EMPTY' ? obj.last_name : '';
        const full = `${fn} ${ln}`.trim();
        return full || obj.name || obj.email || '';
    };

    // Normalize assigned_to_type once on mount
    React.useEffect(() => {
      // Only run once for initial normalization
      setFormData(prev => {
        if (!prev.assigned_to) return prev;
        
        // If already properly typed, keep it
        if (prev.assigned_to_type === 'user_id' || prev.assigned_to_type === 'pending_email' || prev.assigned_to_type === 'free_text') {
          return prev;
        }
        
        // Auto-detect type based on content
        if (isUUID(prev.assigned_to)) {
          return { ...prev, assigned_to_type: 'user_id' };
        }
        if (isEmail(prev.assigned_to)) {
          return { ...prev, assigned_to_type: 'pending_email' };
        }
        
        // Default to free_text for anything else
        return { ...prev, assigned_to_type: 'free_text' };
      });
    }, []); // Only run once on mount

    React.useEffect(() => {
      const loadData = async () => {
        try {
          if (!window.collaboratorAPI || !eventId) return;
          const rows = (await window.collaboratorAPI.getAllCollaboratorsForTaskAssignment(eventId)) || [];
          
          // Loaded collaborators and current assignment

          // Try to enrich missing names from profiles
          const ids = [...new Set(rows.map(getUserId).filter(Boolean))];
          if (ids.length && window.supabaseClient) {
            const { data: profiles, error } = await window.supabaseClient
              .from('profiles')
              .select('id, first_name, last_name, display_name, full_name, email')
              .in('id', ids);

            if (!error && profiles?.length) {
              // Loaded profiles for enrichment
              const byId = Object.fromEntries(profiles.map(p => [p.id, p]));
              const enriched = rows.map(r => {
                const uid = getUserId(r);
                const p = uid ? byId[uid] : null;
                if (p) {
                  // Create a comprehensive display name
                  const firstName = r.first_name || p.first_name || '';
                  const lastName = r.last_name || p.last_name || '';
                  const fullName = `${firstName} ${lastName}`.trim();
                  const displayName = r.displayName || r.display_name || p.display_name || p.full_name || fullName;
                  
                  return {
                    ...r,
                    first_name: firstName,
                    last_name: lastName,
                    displayName: displayName,
                    email: r.email || p.email || r.email
                  };
                }
                return r;
              });
              // Enriched collaborators with profile data
              setAllCollaborators(enriched);
              return;
            }
          }

          setAllCollaborators(rows);
        } catch (err) {
          console.error('🔍 EditTaskForm - Error loading collaborators:', err);
          setAllCollaborators([]);
        }
      };
      loadData();
    }, [eventId]);

    // Set initial input value when collaborators are loaded
    React.useEffect(() => {
      if (!formData.assigned_to) return;

      // Setting input value for assigned_to field

      // If we already have a human-friendly string (free text or email), show it
      if (formData.assigned_to_type === 'free_text' || formData.assigned_to_type === 'pending_email') {
        // But if it's actually a UUID, we should treat it as user_id
        if (isUUID(formData.assigned_to)) {
          setFormData(prev => ({ ...prev, assigned_to_type: 'user_id' }));
          return;
        }
        setInputValue(formData.assigned_to);
        return;
      }

      // For user ids, try to resolve against loaded collaborators
      if (formData.assigned_to_type === 'user_id' || isUUID(formData.assigned_to)) {
        const match = allCollaborators.find(c => getUserId(c) === formData.assigned_to);
        
        if (match) {
          const displayName = formatCollaboratorForDisplay(match);
          setInputValue(displayName);
        } else {
          // If no match found but we have collaborators loaded, show partial UUID
          if (allCollaborators.length > 0) {
            setInputValue(`User ${formData.assigned_to.slice(0, 8)}...`);
          } else {
            // If collaborators not loaded yet, show loading indicator instead of UUID
            setInputValue('Loading...');
          }
        }
        return;
      }

      // Fallback: show the assigned_to value as-is
      setInputValue(formData.assigned_to);
    }, [formData.assigned_to, formData.assigned_to_type, allCollaborators]);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('#assigned_to') && !event.target.closest('.dropdown-menu')) {
                setShowCollaboratorDropdown(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        try {
            const taskData = {
                ...formData,
                event_id: eventId
            };

            if (task?.id) {
                await window.TaskAPI.updateTask(task.id, taskData);
            } else {
                await window.TaskAPI.createTask(taskData);
            }

            onSave();
        } catch (error) {
            setErrors({ general: 'Failed to save task: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                            <div className="p-2 bg-indigo-100 rounded-xl mr-3">
                                <div className="icon-edit-3 text-lg text-indigo-600"></div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">
                                {task?.id ? 'Edit Task' : 'Create New Task'}
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            aria-label="Close"
                        >
                            <i className="fas fa-times text-lg"></i>
                        </button>
                    </div>

                    {errors.general && (
                        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
                            <span className="text-red-700">{errors.general}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Task Title */}
                        <div className="bg-gray-50 p-3 rounded-xl">
                            <label className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                                <div className="icon-clipboard text-sm mr-2"></div>
                                Task Title
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 bg-white"
                                placeholder="Enter task title..."
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="bg-gray-50 p-3 rounded-xl">
                            <label className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                                <div className="icon-file-text text-sm mr-2"></div>
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 bg-white resize-none"
                                rows="2"
                                placeholder="Add task description..."
                            />
                        </div>

                        {/* Priority and Status */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 p-3 rounded-xl">
                                <label className="text-xs font-semibold text-gray-700 mb-2 block">Priority</label>
                                <select
                                    value={formData.priority}
                                    onChange={(e) => handleChange('priority', e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-xl">
                                <label className="text-xs font-semibold text-gray-700 mb-2 block">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => handleChange('status', e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                        </div>

                        {/* Assigned To */}
                        <div className="bg-gray-50 p-3 rounded-xl">
                            <label className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                                <div className="icon-user text-sm mr-2"></div>
                                Assigned To
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    id="assigned_to"
                                    value={inputValue}
                                    onFocus={() => setShowCollaboratorDropdown(true)}
                                    onChange={(e) => {
                                        setInputValue(e.target.value);
                                        handleChange('assigned_to', e.target.value);
                                        handleChange('assigned_to_type', 'free_text');
                                    }}
                                    placeholder="Type a name/email or pick from collaborators…"
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                                />

                                {showCollaboratorDropdown && allCollaborators.length > 0 && (
                                    <div className="dropdown-menu absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                        {allCollaborators.map((collaborator) => (
                                            <button
                                                key={collaborator.id || collaborator.user_id || collaborator.email}
                                                type="button"
                                            onClick={() => {
                                              if ((collaborator.status || '').toLowerCase() === 'pending') {
                                                handleChange('assigned_to', collaborator.email);
                                                handleChange('assigned_to_type', 'pending_email');
                                                setInputValue(collaborator.email);
                                              } else {
                                                const uid = getUserId(collaborator);
                                                handleChange('assigned_to', uid || collaborator.email);
                                                handleChange('assigned_to_type', uid ? 'user_id' : 'pending_email');
                                                setInputValue(formatCollaboratorForDisplay(collaborator));
                                              }
                                              setShowCollaboratorDropdown(false);
                                            }}
                                                className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:outline-none"
                                            >
                                                <div className="font-medium">
                                                    {formatCollaboratorForDisplay(collaborator)}
                                                    {collaborator.status === 'pending' && (
                                                        <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                                                            Pending
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-500">{collaborator.role}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Due Date */}
                        <div className="bg-gray-50 p-3 rounded-xl">
                            <label className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                                <div className="icon-calendar text-sm mr-2"></div>
                                Due Date
                            </label>
                            <input
                                type="date"
                                value={formData.due_date}
                                onChange={(e) => handleChange('due_date', e.target.value)}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-5 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`px-5 py-2 rounded-xl font-medium flex items-center space-x-2 ${
                                    loading 
                                        ? 'bg-gray-400 text-white cursor-not-allowed' 
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <div className="icon-loader text-sm animate-spin"></div>
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="icon-save text-sm"></div>
                                        <span>{task?.id ? 'Update Task' : 'Create Task'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
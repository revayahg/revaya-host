/**
 * AI Task Suggestions Modal Component
 * File: components/Events/AITaskSuggestionsModal.js
 */

function AITaskSuggestionsModal({ isOpen, onClose, suggestions, onCreateTasks, documentName, eventId }) {
    const [editableSuggestions, setEditableSuggestions] = React.useState([]);
    const [selectedTasks, setSelectedTasks] = React.useState(new Set());
    const [isCreating, setIsCreating] = React.useState(false);
    const [allCollaborators, setAllCollaborators] = React.useState([]);
    const [showCollaboratorDropdown, setShowCollaboratorDropdown] = React.useState({});
    const [inputValues, setInputValues] = React.useState({});

    // Helper functions for collaborator handling
    const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const isEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
    
    const getUserId = (obj) => {
        return obj.user_id || obj.id;
    };
    
    const formatCollaboratorForDisplay = (obj) => {
        const fn = obj.first_name && obj.first_name !== 'EMPTY' ? obj.first_name : '';
        const ln = obj.last_name && obj.last_name !== 'EMPTY' ? obj.last_name : '';
        const full = `${fn} ${ln}`.trim();
        return full || obj.name || obj.email || '';
    };

    // Load collaborators when modal opens
    React.useEffect(() => {
        const loadCollaborators = async () => {
            if (!isOpen || !eventId || !window.collaboratorAPI) return;
            
            try {
                const rows = (await window.collaboratorAPI.getAllCollaboratorsForTaskAssignment(eventId)) || [];
                
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
            } catch (error) {
                console.error('Failed to load collaborators:', error);
                setAllCollaborators([]);
            }
        };
        
        loadCollaborators();
    }, [isOpen, eventId]);

    // Close dropdowns when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.assignee-dropdown')) {
                setShowCollaboratorDropdown({});
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Initialize editable suggestions when modal opens
    React.useEffect(() => {
        if (isOpen && suggestions) {
            const editable = suggestions.map((suggestion, index) => ({
                id: `suggestion-${index}`,
                title: suggestion.title || '',
                description: suggestion.description || '',
                priority: suggestion.priority || 'medium',
                suggested_due_date: suggestion.suggested_due_date || null,
                reasoning: suggestion.reasoning || '',
                assigned_to: '',
                assigned_to_type: 'free_text',
                original: suggestion
            }));
            setEditableSuggestions(editable);
            setSelectedTasks(new Set());
            setInputValues({});
            setShowCollaboratorDropdown({});
        }
    }, [isOpen, suggestions]);

    const handleFieldChange = (suggestionId, field, value) => {
        setEditableSuggestions(prev => 
            prev.map(suggestion => 
                suggestion.id === suggestionId 
                    ? { ...suggestion, [field]: value }
                    : suggestion
            )
        );
    };

    const handleAssigneeChange = (suggestionId, value) => {
        setInputValues(prev => ({ ...prev, [suggestionId]: value }));
        handleFieldChange(suggestionId, 'assigned_to', value);
        handleFieldChange(suggestionId, 'assigned_to_type', 'free_text');
    };

    const handleCollaboratorSelect = (suggestionId, collaborator) => {
        if ((collaborator.status || '').toLowerCase() === 'pending') {
            handleFieldChange(suggestionId, 'assigned_to', collaborator.email);
            handleFieldChange(suggestionId, 'assigned_to_type', 'pending_email');
            setInputValues(prev => ({ ...prev, [suggestionId]: collaborator.email }));
        } else {
            const uid = getUserId(collaborator);
            handleFieldChange(suggestionId, 'assigned_to', uid || collaborator.email);
            handleFieldChange(suggestionId, 'assigned_to_type', uid ? 'user_id' : 'pending_email');
            setInputValues(prev => ({ ...prev, [suggestionId]: formatCollaboratorForDisplay(collaborator) }));
        }
        setShowCollaboratorDropdown(prev => ({ ...prev, [suggestionId]: false }));
    };

    const toggleDropdown = (suggestionId) => {
        setShowCollaboratorDropdown(prev => ({ 
            ...prev, 
            [suggestionId]: !prev[suggestionId] 
        }));
    };

    const handleTaskToggle = (suggestionId) => {
        setSelectedTasks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(suggestionId)) {
                newSet.delete(suggestionId);
            } else {
                newSet.add(suggestionId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        setSelectedTasks(new Set(editableSuggestions.map(s => s.id)));
    };

    const handleDeselectAll = () => {
        setSelectedTasks(new Set());
    };

    const handleCreateTasks = async () => {
        if (selectedTasks.size === 0) return;

        setIsCreating(true);
        try {
            const tasksToCreate = editableSuggestions
                .filter(suggestion => selectedTasks.has(suggestion.id))
                .map(suggestion => ({
                    title: suggestion.title,
                    description: suggestion.description,
                    priority: suggestion.priority,
                    due_date: suggestion.suggested_due_date,
                    status: 'not_started',
                    assigned_to: suggestion.assigned_to,
                    assigned_to_type: suggestion.assigned_to_type
                }));

            await onCreateTasks(tasksToCreate);
            onClose();
            window.showToast(`${tasksToCreate.length} tasks created successfully!`, 'success');
        } catch (error) {
            console.error('Create tasks error:', error);
            window.showToast('Failed to create tasks', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800 border-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    if (!isOpen) return null;

    return React.createElement('div', {
        className: 'ai-task-modal-wrapper fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
    }, React.createElement('div', {
        className: 'ai-task-modal-content bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col'
    }, [
        // Header
        React.createElement('div', {
            key: 'header',
            className: 'ai-task-modal-header flex items-center justify-between p-6 border-b border-gray-200'
        }, [
            React.createElement('div', {
                key: 'header-content'
            }, [
                React.createElement('h2', {
                    key: 'title',
                    className: 'ai-task-modal-title text-xl font-semibold text-gray-900'
                }, 'AI Task Suggestions'),
                React.createElement('p', {
                    key: 'subtitle',
                    className: 'ai-task-modal-subtitle text-sm text-gray-600 mt-1'
                }, `Based on: ${documentName}`)
            ]),
            React.createElement('button', {
                key: 'close-btn',
                onClick: onClose,
                className: 'text-gray-400 hover:text-gray-600 transition-colors'
            }, React.createElement('i', {
                className: 'fas fa-times text-xl'
            }))
        ]),

        // Content
        React.createElement('div', {
            key: 'content',
            className: 'ai-task-modal-body flex-1 overflow-y-auto p-6'
        }, [
            // Action Buttons
            React.createElement('div', {
                key: 'actions',
                className: 'flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2'
            }, [
                React.createElement('div', {
                    key: 'select-actions',
                    className: 'select-actions flex space-x-2'
                }, [
                    React.createElement('button', {
                        key: 'select-all',
                        onClick: handleSelectAll,
                        className: 'px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors'
                    }, 'Select All'),
                    React.createElement('button', {
                        key: 'deselect-all',
                        onClick: handleDeselectAll,
                        className: 'px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors'
                    }, 'Deselect All')
                ]),
                React.createElement('div', {
                    key: 'selection-count',
                    className: 'text-sm text-gray-600'
                }, `${selectedTasks.size} of ${editableSuggestions.length} selected`)
            ]),

            // Task Suggestions
            React.createElement('div', {
                key: 'suggestions',
                className: 'space-y-4'
            }, editableSuggestions.map(suggestion => React.createElement('div', {
                key: suggestion.id,
                className: `ai-task-suggestion-card border rounded-lg p-4 transition-all duration-200 ${
                    selectedTasks.has(suggestion.id) 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                }`
            }, [
                // Task Header
                React.createElement('div', {
                    key: 'task-header',
                    className: 'ai-task-suggestion-header flex items-start justify-between mb-3'
                }, [
                    React.createElement('div', {
                        key: 'task-checkbox',
                        className: 'flex items-center space-x-3'
                    }, [
                        React.createElement('input', {
                            key: 'checkbox',
                            type: 'checkbox',
                            checked: selectedTasks.has(suggestion.id),
                            onChange: () => handleTaskToggle(suggestion.id),
                            className: 'w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500'
                        }),
                        React.createElement('div', {
                            key: 'task-info',
                            className: 'flex-1'
                        }, [
                            React.createElement('input', {
                                key: 'title-input',
                                type: 'text',
                                value: suggestion.title,
                                onChange: (e) => handleFieldChange(suggestion.id, 'title', e.target.value),
                                className: 'ai-task-suggestion-title w-full text-lg font-medium text-gray-900 border-none bg-transparent focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1 -mx-2 -my-1',
                                placeholder: 'Task title...'
                            })
                        ])
                    ]),
                    React.createElement('select', {
                        key: 'priority-select',
                        value: suggestion.priority,
                        onChange: (e) => handleFieldChange(suggestion.id, 'priority', e.target.value),
                        className: `px-2 py-1 text-xs rounded-full border ${getPriorityColor(suggestion.priority)}`
                    }, [
                        React.createElement('option', { key: 'high', value: 'high' }, 'High'),
                        React.createElement('option', { key: 'medium', value: 'medium' }, 'Medium'),
                        React.createElement('option', { key: 'low', value: 'low' }, 'Low')
                    ])
                ]),

                // Description
                React.createElement('div', {
                    key: 'description',
                    className: 'ai-task-suggestion-field mb-3'
                }, [
                    React.createElement('label', {
                        key: 'desc-label',
                        className: 'block text-sm font-medium text-gray-700 mb-1'
                    }, 'Description'),
                    React.createElement('textarea', {
                        key: 'desc-textarea',
                        value: suggestion.description,
                        onChange: (e) => handleFieldChange(suggestion.id, 'description', e.target.value),
                        className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                        rows: 3,
                        placeholder: 'Task description...'
                    })
                ]),

                // Due Date and Assignee
                React.createElement('div', {
                    key: 'meta-info',
                    className: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'
                }, [
                    React.createElement('div', {
                        key: 'due-date',
                        className: 'ai-task-suggestion-field'
                    }, [
                        React.createElement('label', {
                            key: 'date-label',
                            className: 'block text-sm font-medium text-gray-700 mb-1'
                        }, 'Due Date'),
                        React.createElement('input', {
                            key: 'date-input',
                            type: 'date',
                            value: suggestion.suggested_due_date || '',
                            onChange: (e) => handleFieldChange(suggestion.id, 'suggested_due_date', e.target.value || null),
                            className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                        })
                    ]),
                    React.createElement('div', {
                        key: 'assignee',
                        className: 'ai-task-suggestion-field ai-task-assignee-dropdown'
                    }, [
                        React.createElement('label', {
                            key: 'assignee-label',
                            className: 'block text-sm font-medium text-gray-700 mb-1'
                        }, 'Assigned To'),
                        React.createElement('div', {
                            key: 'assignee-container',
                            className: 'relative assignee-dropdown'
                        }, [
                            React.createElement('input', {
                                key: 'assignee-input',
                                type: 'text',
                                value: inputValues[suggestion.id] || '',
                                onFocus: () => toggleDropdown(suggestion.id),
                                onChange: (e) => handleAssigneeChange(suggestion.id, e.target.value),
                                placeholder: 'Type a name/email or pick from collaborators…',
                                className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                            }),
                            showCollaboratorDropdown[suggestion.id] && allCollaborators.length > 0 && React.createElement('div', {
                                key: 'dropdown',
                                className: 'ai-task-assignee-list absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto'
                            }, allCollaborators.map(collaborator => React.createElement('button', {
                                key: collaborator.id || collaborator.user_id || collaborator.email,
                                type: 'button',
                                onClick: () => handleCollaboratorSelect(suggestion.id, collaborator),
                                className: 'w-full px-3 py-2 text-left hover:bg-gray-100 focus:outline-none'
                            }, formatCollaboratorForDisplay(collaborator))))
                        ])
                    ])
                ]),

                // AI Reasoning
                React.createElement('div', {
                    key: 'reasoning',
                    className: 'mb-3'
                }, [
                    React.createElement('label', {
                        key: 'reason-label',
                        className: 'block text-sm font-medium text-gray-700 mb-1'
                    }, 'AI Reasoning'),
                    React.createElement('p', {
                        key: 'reason-text',
                        className: 'text-sm text-gray-600 bg-gray-50 p-2 rounded'
                    }, suggestion.reasoning)
                ])
            ])))
        ]),

        // Footer
        React.createElement('div', {
            key: 'footer',
            className: 'ai-task-modal-actions flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50'
        }, [
            React.createElement('button', {
                key: 'cancel-btn',
                onClick: onClose,
                className: 'px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors'
            }, 'Cancel'),
            React.createElement('button', {
                key: 'create-btn',
                onClick: handleCreateTasks,
                disabled: selectedTasks.size === 0 || isCreating,
                className: `create-button px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                    selectedTasks.size === 0 || isCreating
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                }`
            }, isCreating ? 'Creating Tasks...' : `Create ${selectedTasks.size} Selected Tasks`)
        ])
    ]));
}

window.AITaskSuggestionsModal = AITaskSuggestionsModal;

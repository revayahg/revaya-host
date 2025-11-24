/**
 * Staff Manager Component
 * File: components/Events/StaffManager.js
 * Manages event staff assignments with inline editing
 */

function StaffManager({ eventId, userRole }) {
    const [staff, setStaff] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [editingId, setEditingId] = React.useState(null);
    const [editingStaffData, setEditingStaffData] = React.useState(null);
    const [newStaff, setNewStaff] = React.useState({
        name: '',
        role: '',
        shift: '',
        contact: '',
        confirmed: false,
        notes: ''
    });
    const [filter, setFilter] = React.useState('all'); // all, confirmed, pending
    const [sortBy, setSortBy] = React.useState('name'); // name, role, shift, confirmed
    const [sortOrder, setSortOrder] = React.useState('asc'); // asc, desc
    const [stats, setStats] = React.useState(null);
    const [tableError, setTableError] = React.useState(null);

    const canEdit = userRole === 'owner' || userRole === 'editor';

    // Load staff data
    React.useEffect(() => {
        loadStaff();
    }, [eventId]);

    const loadStaff = async () => {
        try {
            setLoading(true);
            const [staffData, statsData] = await Promise.all([
                window.staffAPI.getStaff(eventId),
                window.staffAPI.getStaffStats(eventId)
            ]);
            setStaff(staffData);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading staff:', error);
            const errorMessage = error.message || 'Failed to load staff data';
            // Check if table doesn't exist
            if (error.message && (error.message.includes('does not exist') || error.message.includes('404') || error.code === '42P01')) {
                console.error('CRITICAL: event_staff table does not exist. Migration needed.');
                setTableError('The event_staff table does not exist. Please run the database migration: database/migrations/20251028000007_create_event_staff_table.sql');
            } else {
                setTableError(errorMessage);
                window.showToast(errorMessage, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    // Handle inline editing
    const handleEdit = (staffId) => {
        const staffMember = staff.find(s => s.id === staffId);
        if (!staffMember) {
            return;
        }
        setEditingId(staffId);
        setEditingStaffData({
            name: staffMember.name || '',
            role: staffMember.role || '',
            shift: staffMember.shift || '',
            contact: staffMember.contact || '',
            confirmed: !!staffMember.confirmed,
            notes: staffMember.notes || ''
        });
    };

    const handleSave = async (staffId) => {
        try {
            if (!editingStaffData) {
                return;
            }

            if (!editingStaffData.name || !editingStaffData.name.trim()) {
                window.showToast('Name is required', 'error');
                return;
            }

            const updates = {
                name: editingStaffData.name.trim(),
                role: editingStaffData.role ? editingStaffData.role.trim() : null,
                shift: editingStaffData.shift ? editingStaffData.shift.trim() : null,
                contact: editingStaffData.contact ? editingStaffData.contact.trim() : null,
                confirmed: !!editingStaffData.confirmed,
                notes: editingStaffData.notes ? editingStaffData.notes.trim() : null
            };

            const updatedStaff = await window.staffAPI.updateStaff(staffId, updates);
            setStaff(prev => prev.map(s => s.id === staffId ? updatedStaff : s));
            setEditingId(null);
            setEditingStaffData(null);
            window.showToast('Staff member updated', 'success');
            loadStaff();
        } catch (error) {
            console.error('Error updating staff:', error);
            window.showToast('Failed to update staff member', 'error');
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditingStaffData(null);
    };

    // Handle new staff creation
    const handleAddStaff = async () => {
        if (!newStaff.name.trim()) {
            window.showToast('Name is required', 'error');
            return;
        }

        try {
            const staffData = {
                ...newStaff,
                event_id: eventId
            };
            const createdStaff = await window.staffAPI.createStaff(staffData);
            setStaff(prev => [...prev, createdStaff]);
            setNewStaff({
                name: '',
                role: '',
                shift: '',
                contact: '',
                confirmed: false,
                notes: ''
            });
            window.showToast('Staff member added', 'success');
            loadStaff(); // Refresh stats
        } catch (error) {
            console.error('Error adding staff:', error);
            const errorMessage = error.message || 'Failed to add staff member';
            window.showToast(errorMessage, 'error');
        }
    };

    // Handle delete
    const handleDelete = async (staffId) => {
        if (!confirm('Are you sure you want to delete this staff member?')) {
            return;
        }

        try {
            await window.staffAPI.deleteStaff(staffId);
            setStaff(prev => prev.filter(s => s.id !== staffId));
            window.showToast('Staff member deleted', 'success');
            loadStaff(); // Refresh stats
        } catch (error) {
            console.error('Error deleting staff:', error);
            window.showToast('Failed to delete staff member', 'error');
        }
    };

    // Handle copy to clipboard
    const handleCopyToClipboard = async () => {
        const success = await window.staffAPI.copyToClipboard(staff);
        if (success) {
            window.showToast('Staff data copied to clipboard', 'success');
        } else {
            window.showToast('Failed to copy to clipboard', 'error');
        }
    };

    // Filter and sort staff
    const filteredAndSortedStaff = React.useMemo(() => {
        let filtered = staff;

        // Apply filter
        if (filter === 'confirmed') {
            filtered = filtered.filter(s => s.confirmed);
        } else if (filter === 'pending') {
            filtered = filtered.filter(s => !s.confirmed);
        }

        // Apply sort
        filtered.sort((a, b) => {
            let aVal, bVal;
            
            switch (sortBy) {
                case 'name':
                    aVal = a.name || '';
                    bVal = b.name || '';
                    break;
                case 'role':
                    aVal = a.role || '';
                    bVal = b.role || '';
                    break;
                case 'shift':
                    aVal = a.shift || '';
                    bVal = b.shift || '';
                    break;
                case 'confirmed':
                    aVal = a.confirmed ? 1 : 0;
                    bVal = b.confirmed ? 1 : 0;
                    break;
                default:
                    aVal = a.name || '';
                    bVal = b.name || '';
            }

            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        return filtered;
    }, [staff, filter, sortBy, sortOrder]);

    const updateEditingField = (field, value) => {
        setEditingStaffData(prev => prev ? { ...prev, [field]: value } : prev);
    };

    const renderTableRow = (staffMember) => {
        const isEditing = editingId === staffMember.id;

        return React.createElement('tr', {
            key: staffMember.id,
            className: 'hover:bg-gray-50'
        }, [
            React.createElement('td', {
                key: 'name-cell',
                className: 'px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'
            }, isEditing
                ? React.createElement('input', {
                    type: 'text',
                    value: editingStaffData?.name ?? '',
                    onChange: (e) => updateEditingField('name', e.target.value),
                    className: 'w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                })
                : staffMember.name),
            React.createElement('td', {
                key: 'role-cell',
                className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500'
            }, isEditing
                ? React.createElement('input', {
                    type: 'text',
                    value: editingStaffData?.role ?? '',
                    onChange: (e) => updateEditingField('role', e.target.value),
                    className: 'w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                })
                : (staffMember.role || '-')),
            React.createElement('td', {
                key: 'shift-cell',
                className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500'
            }, isEditing
                ? React.createElement('input', {
                    type: 'text',
                    value: editingStaffData?.shift ?? '',
                    onChange: (e) => updateEditingField('shift', e.target.value),
                    className: 'w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                })
                : (staffMember.shift || '-')),
            React.createElement('td', {
                key: 'contact-cell',
                className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500'
            }, isEditing
                ? React.createElement('input', {
                    type: 'text',
                    value: editingStaffData?.contact ?? '',
                    onChange: (e) => updateEditingField('contact', e.target.value),
                    className: 'w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                })
                : (staffMember.contact || '-')),
            React.createElement('td', {
                key: 'confirmed-cell',
                className: 'px-6 py-4 whitespace-nowrap'
            }, isEditing
                ? React.createElement('label', {
                    className: 'inline-flex items-center space-x-2 text-sm text-gray-700'
                }, [
                    React.createElement('input', {
                        key: 'confirmed-checkbox-edit',
                        type: 'checkbox',
                        checked: !!(editingStaffData?.confirmed),
                        onChange: (e) => updateEditingField('confirmed', e.target.checked),
                        className: 'h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500'
                    }),
                    React.createElement('span', { key: 'confirmed-label-edit' }, 'Confirmed')
                ])
                : React.createElement('span', {
                    className: 'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' +
                        (staffMember.confirmed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')
                }, staffMember.confirmed ? 'Yes' : 'No')),
            React.createElement('td', {
                key: 'notes-cell',
                className: 'px-6 py-4 text-sm text-gray-500'
            }, isEditing
                ? React.createElement('input', {
                    type: 'text',
                    value: editingStaffData?.notes ?? '',
                    onChange: (e) => updateEditingField('notes', e.target.value),
                    className: 'w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                })
                : (staffMember.notes || '-')),
            canEdit && React.createElement('td', {
                key: 'actions-cell',
                className: 'px-6 py-4 whitespace-nowrap text-sm font-medium'
            }, isEditing
                ? React.createElement('div', {
                    className: 'flex space-x-2'
                }, [
                    React.createElement('button', {
                        key: 'save-btn',
                        onClick: () => handleSave(staffMember.id),
                        className: 'text-green-600 hover:text-green-800'
                    }, 'Save'),
                    React.createElement('button', {
                        key: 'cancel-btn',
                        onClick: handleCancel,
                        className: 'text-gray-600 hover:text-gray-800'
                    }, 'Cancel')
                ])
                : React.createElement('div', {
                    className: 'flex space-x-2'
                }, [
                    React.createElement('button', {
                        key: 'edit-btn',
                        onClick: () => handleEdit(staffMember.id),
                        className: 'text-indigo-600 hover:text-indigo-900'
                    }, 'Edit'),
                    React.createElement('button', {
                        key: 'delete-btn',
                        onClick: () => handleDelete(staffMember.id),
                        className: 'text-red-600 hover:text-red-900'
                    }, 'Delete')
                ]))
        ]);
    };

    const renderStaffCard = (staffMember) => {
        const isEditing = editingId === staffMember.id;
        const confirmedForDisplay = isEditing ? !!(editingStaffData?.confirmed) : staffMember.confirmed;

        return React.createElement('div', {
            key: 'card-' + staffMember.id,
            className: 'staff-card'
        }, [
            React.createElement('div', {
                key: 'card-header',
                className: 'staff-card-header'
            }, [
                React.createElement('div', {
                    key: 'card-name-wrapper'
                }, isEditing
                    ? React.createElement('input', {
                        type: 'text',
                        value: editingStaffData?.name ?? '',
                        onChange: (e) => updateEditingField('name', e.target.value),
                        className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                    })
                    : React.createElement('h4', {
                        key: 'card-name',
                        className: 'staff-card-name'
                    }, staffMember.name)),
                React.createElement('span', {
                    key: 'card-status',
                    className: 'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' +
                        (confirmedForDisplay ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')
                }, confirmedForDisplay ? 'Confirmed' : 'Pending')
            ]),
            React.createElement('div', {
                key: 'card-fields'
            }, isEditing
                ? React.createElement('div', {
                    className: 'space-y-3'
                }, [
                    React.createElement('div', {
                        key: 'role-edit'
                    }, [
                        React.createElement('label', {
                            key: 'role-label-edit',
                            className: 'staff-card-label'
                        }, 'Role'),
                        React.createElement('input', {
                            key: 'role-input-edit',
                            type: 'text',
                            value: editingStaffData?.role ?? '',
                            onChange: (e) => updateEditingField('role', e.target.value),
                            className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                        })
                    ]),
                    React.createElement('div', {
                        key: 'shift-edit'
                    }, [
                        React.createElement('label', {
                            key: 'shift-label-edit',
                            className: 'staff-card-label'
                        }, 'Shift'),
                        React.createElement('input', {
                            key: 'shift-input-edit',
                            type: 'text',
                            value: editingStaffData?.shift ?? '',
                            onChange: (e) => updateEditingField('shift', e.target.value),
                            className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                        })
                    ]),
                    React.createElement('div', {
                        key: 'contact-edit'
                    }, [
                        React.createElement('label', {
                            key: 'contact-label-edit',
                            className: 'staff-card-label'
                        }, 'Contact'),
                        React.createElement('input', {
                            key: 'contact-input-edit',
                            type: 'text',
                            value: editingStaffData?.contact ?? '',
                            onChange: (e) => updateEditingField('contact', e.target.value),
                            className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                        })
                    ]),
                    React.createElement('div', {
                        key: 'confirmed-edit',
                        className: 'flex items-center space-x-2'
                    }, [
                        React.createElement('input', {
                            key: 'confirmed-checkbox-card',
                            type: 'checkbox',
                            checked: !!(editingStaffData?.confirmed),
                            onChange: (e) => updateEditingField('confirmed', e.target.checked),
                            className: 'h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500'
                        }),
                        React.createElement('span', {
                            key: 'confirmed-text-card',
                            className: 'text-sm text-gray-700'
                        }, 'Confirmed')
                    ]),
                    React.createElement('div', {
                        key: 'notes-edit'
                    }, [
                        React.createElement('label', {
                            key: 'notes-label-edit',
                            className: 'staff-card-label'
                        }, 'Notes'),
                        React.createElement('input', {
                            key: 'notes-input-edit',
                            type: 'text',
                            value: editingStaffData?.notes ?? '',
                            onChange: (e) => updateEditingField('notes', e.target.value),
                            className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                        })
                    ])
                ])
                : [
                    React.createElement('div', {
                        key: 'role-field',
                        className: 'staff-card-field'
                    }, [
                        React.createElement('span', {
                            key: 'role-label',
                            className: 'staff-card-label'
                        }, 'Role'),
                        React.createElement('span', {
                            key: 'role-value',
                            className: 'staff-card-value'
                        }, staffMember.role || '-')
                    ]),
                    React.createElement('div', {
                        key: 'shift-field',
                        className: 'staff-card-field'
                    }, [
                        React.createElement('span', {
                            key: 'shift-label',
                            className: 'staff-card-label'
                        }, 'Shift'),
                        React.createElement('span', {
                            key: 'shift-value',
                            className: 'staff-card-value'
                        }, staffMember.shift || '-')
                    ]),
                    React.createElement('div', {
                        key: 'contact-field',
                        className: 'staff-card-field'
                    }, [
                        React.createElement('span', {
                            key: 'contact-label',
                            className: 'staff-card-label'
                        }, 'Contact'),
                        React.createElement('span', {
                            key: 'contact-value',
                            className: 'staff-card-value'
                        }, staffMember.contact || '-')
                    ]),
                    staffMember.notes && React.createElement('div', {
                        key: 'notes-field',
                        className: 'staff-card-field'
                    }, [
                        React.createElement('span', {
                            key: 'notes-label',
                            className: 'staff-card-label'
                        }, 'Notes'),
                        React.createElement('span', {
                            key: 'notes-value',
                            className: 'staff-card-value'
                        }, staffMember.notes)
                    ])
                ]),
            canEdit && React.createElement('div', {
                key: 'card-actions',
                className: 'staff-card-actions'
            }, isEditing
                ? [
                    React.createElement('button', {
                        key: 'save-btn',
                        onClick: () => handleSave(staffMember.id),
                        className: 'px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors'
                    }, 'Save'),
                    React.createElement('button', {
                        key: 'cancel-btn',
                        onClick: handleCancel,
                        className: 'px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors'
                    }, 'Cancel')
                ]
                : [
                    React.createElement('button', {
                        key: 'edit-btn',
                        onClick: () => handleEdit(staffMember.id),
                        className: 'px-3 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors'
                    }, 'Edit'),
                    React.createElement('button', {
                        key: 'delete-btn',
                        onClick: () => handleDelete(staffMember.id),
                        className: 'px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors'
                    }, 'Delete')
                ])
        ]);
    };

    if (loading) {
        return React.createElement('div', {
            className: 'flex items-center justify-center p-8'
        }, React.createElement('div', {
            className: 'animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent'
        }));
    }

    return React.createElement('div', {
        className: 'space-y-6'
    }, [
        // Error message if table doesn't exist
        tableError && React.createElement('div', {
            key: 'error-message',
            className: 'p-4 bg-red-50 border border-red-200 rounded-lg'
        }, [
            React.createElement('div', {
                key: 'error-title',
                className: 'flex items-center space-x-2 text-red-800 font-medium mb-2'
            }, [
                React.createElement('i', {
                    key: 'error-icon',
                    className: 'fas fa-exclamation-triangle'
                }),
                React.createElement('span', { key: 'error-text' }, 'Database Migration Required')
            ]),
            React.createElement('p', {
                key: 'error-details',
                className: 'text-red-700 text-sm'
            }, tableError)
        ]),
        // Header with stats and actions
        React.createElement('div', {
            key: 'header',
            className: 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'
        }, [
            React.createElement('div', {
                key: 'title-stats'
            }, [
                React.createElement('h2', {
                    key: 'title',
                    className: 'text-2xl font-bold text-gray-900'
                }, 'Staff Management'),
                stats && React.createElement('div', {
                    key: 'stats',
                    className: 'flex items-center space-x-4 text-sm text-gray-600 mt-1'
                }, [
                    React.createElement('span', { key: 'total' }, 'Total: ' + stats.total),
                    React.createElement('span', { key: 'confirmed' }, 'Confirmed: ' + stats.confirmed),
                    React.createElement('span', { key: 'pending' }, 'Pending: ' + stats.pending)
                ])
            ]),
            React.createElement('div', {
                key: 'actions',
                className: 'flex items-center space-x-2 staff-header-actions'
            }, [
                React.createElement('button', {
                    key: 'copy-btn',
                    onClick: handleCopyToClipboard,
                    className: 'px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors'
                }, [
                    React.createElement('i', {
                        key: 'copy-icon',
                        className: 'fas fa-copy mr-1'
                    }),
                    'Copy to Clipboard'
                ])
            ])
        ]),

        // Filters and sorting
        React.createElement('div', {
            key: 'filters',
            className: 'flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg staff-filters-mobile'
        }, [
            React.createElement('div', {
                key: 'filter-group',
                className: 'flex items-center space-x-2'
            }, [
                React.createElement('label', {
                    key: 'filter-label',
                    className: 'text-sm font-medium text-gray-700'
                }, 'Filter:'),
                React.createElement('select', {
                    key: 'filter-select',
                    value: filter,
                    onChange: (e) => setFilter(e.target.value),
                    className: 'px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                }, [
                    React.createElement('option', { key: 'all', value: 'all' }, 'All'),
                    React.createElement('option', { key: 'confirmed', value: 'confirmed' }, 'Confirmed'),
                    React.createElement('option', { key: 'pending', value: 'pending' }, 'Pending')
                ])
            ]),
            React.createElement('div', {
                key: 'sort-group',
                className: 'flex items-center space-x-2'
            }, [
                React.createElement('label', {
                    key: 'sort-label',
                    className: 'text-sm font-medium text-gray-700'
                }, 'Sort by:'),
                React.createElement('select', {
                    key: 'sort-select',
                    value: sortBy,
                    onChange: (e) => setSortBy(e.target.value),
                    className: 'px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                }, [
                    React.createElement('option', { key: 'name', value: 'name' }, 'Name'),
                    React.createElement('option', { key: 'role', value: 'role' }, 'Role'),
                    React.createElement('option', { key: 'shift', value: 'shift' }, 'Shift'),
                    React.createElement('option', { key: 'confirmed', value: 'confirmed' }, 'Status')
                ]),
                React.createElement('button', {
                    key: 'sort-order-btn',
                    onClick: () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'),
                    className: 'px-2 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors'
                }, React.createElement('i', {
                    className: 'fas fa-sort-' + (sortOrder === 'asc' ? 'up' : 'down')
                }))
            ])
        ]),

        // Add new staff form
        canEdit && React.createElement('div', {
            key: 'add-form',
            className: 'p-4 bg-white border border-gray-200 rounded-lg'
        }, [
            React.createElement('h3', {
                key: 'form-title',
                className: 'text-lg font-medium text-gray-900 mb-4'
            }, 'Add New Staff Member'),
            React.createElement('div', {
                key: 'form-grid',
                className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            }, [
                React.createElement('div', {
                    key: 'name-field'
                }, [
                    React.createElement('label', {
                        key: 'name-label',
                        className: 'block text-sm font-medium text-gray-700 mb-1'
                    }, 'Name *'),
                    React.createElement('input', {
                        key: 'name-input',
                        type: 'text',
                        value: newStaff.name,
                        onChange: (e) => setNewStaff(prev => ({ ...prev, name: e.target.value })),
                        className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                        placeholder: 'Staff member name'
                    })
                ]),
                React.createElement('div', {
                    key: 'role-field'
                }, [
                    React.createElement('label', {
                        key: 'role-label',
                        className: 'block text-sm font-medium text-gray-700 mb-1'
                    }, 'Role'),
                    React.createElement('input', {
                        key: 'role-input',
                        type: 'text',
                        value: newStaff.role,
                        onChange: (e) => setNewStaff(prev => ({ ...prev, role: e.target.value })),
                        className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                        placeholder: 'e.g., VIP Door, Check-in'
                    })
                ]),
                React.createElement('div', {
                    key: 'shift-field'
                }, [
                    React.createElement('label', {
                        key: 'shift-label',
                        className: 'block text-sm font-medium text-gray-700 mb-1'
                    }, 'Shift'),
                    React.createElement('input', {
                        key: 'shift-input',
                        type: 'text',
                        value: newStaff.shift,
                        onChange: (e) => setNewStaff(prev => ({ ...prev, shift: e.target.value })),
                        className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                        placeholder: 'e.g., 6-10 AM, 12-4 PM'
                    })
                ]),
                React.createElement('div', {
                    key: 'contact-field'
                }, [
                    React.createElement('label', {
                        key: 'contact-label',
                        className: 'block text-sm font-medium text-gray-700 mb-1'
                    }, 'Contact'),
                    React.createElement('input', {
                        key: 'contact-input',
                        type: 'text',
                        value: newStaff.contact,
                        onChange: (e) => setNewStaff(prev => ({ ...prev, contact: e.target.value })),
                        className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                        placeholder: 'Phone or email'
                    })
                ]),
                React.createElement('div', {
                    key: 'confirmed-field',
                    className: 'flex items-center'
                }, [
                    React.createElement('input', {
                        key: 'confirmed-checkbox',
                        type: 'checkbox',
                        checked: newStaff.confirmed,
                        onChange: (e) => setNewStaff(prev => ({ ...prev, confirmed: e.target.checked })),
                        className: 'h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500'
                    }),
                    React.createElement('label', {
                        key: 'confirmed-label',
                        className: 'ml-2 text-sm font-medium text-gray-700'
                    }, 'Confirmed')
                ]),
                React.createElement('div', {
                    key: 'notes-field',
                    className: 'md:col-span-2 lg:col-span-1'
                }, [
                    React.createElement('label', {
                        key: 'notes-label',
                        className: 'block text-sm font-medium text-gray-700 mb-1'
                    }, 'Notes'),
                    React.createElement('input', {
                        key: 'notes-input',
                        type: 'text',
                        value: newStaff.notes,
                        onChange: (e) => setNewStaff(prev => ({ ...prev, notes: e.target.value })),
                        className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                        placeholder: 'Additional notes'
                    })
                ])
            ]),
            React.createElement('div', {
                key: 'form-actions',
                className: 'flex justify-end mt-4'
            }, React.createElement('button', {
                key: 'add-btn',
                onClick: handleAddStaff,
                className: 'px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors'
            }, 'Add Staff Member'))
        ]),

        // Staff table (desktop)
        React.createElement('div', {
            key: 'staff-table',
            className: 'staff-table-wrapper bg-white border border-gray-200 rounded-lg overflow-hidden'
        }, [
            React.createElement('div', {
                key: 'table-header',
                className: 'bg-gray-50 px-6 py-3 border-b border-gray-200'
            }, React.createElement('h3', {
                key: 'table-title',
                className: 'text-lg font-medium text-gray-900'
            }, 'Staff Members (' + filteredAndSortedStaff.length + ')')),
            React.createElement('div', {
                key: 'table-content',
                className: 'overflow-x-auto'
            }, React.createElement('table', {
                key: 'table',
                className: 'min-w-full divide-y divide-gray-200'
            }, [
                React.createElement('thead', {
                    key: 'table-head',
                    className: 'bg-gray-50'
                }, React.createElement('tr', {
                    key: 'header-row'
                }, [
                    React.createElement('th', {
                        key: 'name-header',
                        className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                    }, 'Name'),
                    React.createElement('th', {
                        key: 'role-header',
                        className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                    }, 'Role'),
                    React.createElement('th', {
                        key: 'shift-header',
                        className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                    }, 'Shift'),
                    React.createElement('th', {
                        key: 'contact-header',
                        className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                    }, 'Contact'),
                    React.createElement('th', {
                        key: 'confirmed-header',
                        className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                    }, 'Confirmed'),
                    React.createElement('th', {
                        key: 'notes-header',
                        className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                    }, 'Notes'),
                    canEdit && React.createElement('th', {
                        key: 'actions-header',
                        className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                    }, 'Actions')
                ])),
                React.createElement('tbody', {
                    key: 'table-body',
                    className: 'bg-white divide-y divide-gray-200'
                }, filteredAndSortedStaff.map(renderTableRow))
            ]))
        ]),

        // Staff cards (mobile)
        React.createElement('div', {
            key: 'staff-cards',
            className: 'staff-cards-wrapper'
        }, [
            React.createElement('h3', {
                key: 'cards-title',
                className: 'text-lg font-medium text-gray-900 mb-4'
            }, 'Staff Members (' + filteredAndSortedStaff.length + ')'),
            ...filteredAndSortedStaff.map(renderStaffCard)
        ])
    ]);
}

window.StaffManager = StaffManager;
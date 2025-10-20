// Mobile-optimized BudgetSummary - Updated 2025-01-04
function BudgetSummary({ eventId, budgetItems = [], onBudgetChange, onEditBudget, canEdit = true, canViewBudget = true }) {
  try {
    // ALL HOOKS MUST BE DECLARED FIRST
    const [userRole, setUserRole] = React.useState(null);
    const [roleCheckComplete, setRoleCheckComplete] = React.useState(false);
    const [items, setItems] = React.useState([]);
    const [editingMode, setEditingMode] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [newItem, setNewItem] = React.useState({
      category: '',
      description: '',
      allocated: '',
      spent: ''
    });
    const [editingItemId, setEditingItemId] = React.useState(null);
    const [legacyData, setLegacyData] = React.useState(null);
    const [event, setEvent] = React.useState(null);
    const [saving, setSaving] = React.useState(false);
    const [saveTimeout, setSaveTimeout] = React.useState(null);

    const context = React.useContext(window.AuthContext || React.createContext({}));
    const { user } = context;
    
    // Effective permissions (editors allowed)
    const effectiveCanViewBudget = !!(canViewBudget || canEdit || user?.id === event?.user_id || userRole === 'admin' || userRole === 'editor');
    const effectiveCanEdit = !!(canEdit || user?.id === event?.user_id || userRole === 'admin' || userRole === 'editor');

    // Load budget items
    React.useEffect(() => {
      const loadBudgetItems = async () => {
        if (!eventId) return;
        setLoading(true);
        try {
          const items = await window.budgetAPI.getBudgetItems(eventId);
          setItems(items || []);
        } catch (error) {
          console.error('Error loading budget items:', error);
        }
        setLoading(false);
      };
      loadBudgetItems();
    }, [eventId]);

    // Load event data for permissions
    React.useEffect(() => {
      const loadEventData = async () => {
        if (!eventId) return;
        try {
          const { data } = await window.supabaseClient
            .from('events')
            .select('user_id, created_by')
            .eq('id', eventId)
            .single();
          setEvent(data);
        } catch (error) {
        }
      };
      loadEventData();
    }, [eventId]);

    // Role checking
    React.useEffect(() => {
      const checkUserRole = async () => {
        try {
          const session = await window.getSessionWithRetry?.(3, 150);
          if (!session?.user) {
            setRoleCheckComplete(true);
            return;
          }
          
          if (!eventId) {
            setRoleCheckComplete(true);
            return;
          }
          
          const { data: eventData } = await window.supabaseClient
            .from('events')
            .select('user_id, created_by')
            .eq('id', eventId)
            .single();
          
          const isOwner = eventData && (eventData.user_id === session.user.id || eventData.created_by === session.user.id);
          
          if (isOwner) {
            setUserRole('admin');
            setRoleCheckComplete(true);
            return;
          }
          
          const { data: roleData } = await window.supabaseClient
            .from('event_user_roles')
            .select('role')
            .eq('event_id', eventId)
            .eq('user_id', session.user.id)
            .eq('status', 'active')
            .single();
          
          setUserRole(roleData?.role || null);
          setRoleCheckComplete(true);
        } catch (error) {
          setUserRole(null);
          setRoleCheckComplete(true);
        }
      };
      
      checkUserRole();
    }, [eventId]);

    // Event handlers
    const handleEditClick = () => {
      setEditingMode(true);
    };

    const handleAddItem = async () => {
      console.log('Add Item button clicked in BudgetSummary');
      console.log('Current newItem state:', newItem);
      
      // Only category is required - all other fields are optional
      if (!newItem.category) {
        console.log('Missing required field: category');
        if (window.toast) {
          window.toast.error('Please fill in the category name');
        }
        return;
      }
      
      const item = {
        id: Date.now().toString(),
        title: newItem.category,
        category: newItem.category,
        description: newItem.description || '', // Allow empty description
        allocated: newItem.allocated ? parseFloat(newItem.allocated) : 0, // Default to 0 if empty
        spent: newItem.spent ? parseFloat(newItem.spent) : 0, // Default to 0 if empty
        isNew: true
      };
      
      console.log('Adding new item:', item);
      const updatedItems = [...items, item];
      setItems(updatedItems);
      setNewItem({ category: '', description: '', allocated: '', spent: '' });
      
      // Auto-save immediately when adding new item
      setSaving(true);
      try {
        const savedItems = await window.budgetAPI.saveBudgetItems(eventId, updatedItems);
        console.log('New budget item saved:', savedItems);
        onBudgetChange && onBudgetChange(savedItems);
        if (window.toast) {
          window.toast.success('Budget item added and saved');
        }
      } catch (error) {
        console.error('Error saving new budget item:', error);
        if (window.toast) {
          window.toast.error('Failed to save budget item');
        }
      } finally {
        setSaving(false);
      }
    };

    // Auto-save function with debouncing
    const autoSaveBudget = React.useCallback(async (itemsToSave) => {
      if (!eventId || saving) return;
      
      setSaving(true);
      try {
        console.log('Auto-saving budget with items:', itemsToSave);
        const savedItems = await window.budgetAPI.saveBudgetItems(eventId, itemsToSave);
        console.log('Budget auto-saved successfully:', savedItems);
        onBudgetChange && onBudgetChange(savedItems);
        if (window.toast) {
          window.toast.success('Budget saved automatically', { duration: 2000 });
        }
      } catch (error) {
        console.error('Error auto-saving budget:', error);
        if (window.toast) {
          window.toast.error('Failed to save budget changes');
        }
      } finally {
        setSaving(false);
      }
    }, [eventId, onBudgetChange, saving]);

    // Auto-save when items change (debounced)
    React.useEffect(() => {
      if (!editingMode || items.length === 0) return;
      
      // Clear existing timeout
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      
      // Set new timeout for auto-save (1 second after last change)
      const timeout = setTimeout(() => {
        autoSaveBudget(items);
      }, 1000);
      
      setSaveTimeout(timeout);
      
      // Cleanup on unmount
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    }, [items, editingMode]);

    const handleItemChange = (id, field, value) => {
      if ((field === 'allocated' || field === 'spent') && value !== '' && value < 0) return;
      
      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      ));
    };

    const handleSaveChanges = async () => {
      // Keep this for manual save option if needed
      console.log('Manually saving budget changes with items:', items);
      try {
        const savedItems = await window.budgetAPI.saveBudgetItems(eventId, items);
        console.log('Budget items saved successfully:', savedItems);
        setEditingMode(false);
        onBudgetChange && onBudgetChange(items);
        window.showToast && window.showToast('Budget updated successfully', 'success');
      } catch (error) {
        console.error('Error saving budget:', error);
        window.showToast && window.showToast('Failed to save budget', 'error');
      }
    };

    const handleDeleteItem = async (itemId) => {
      const updatedItems = items.filter(item => item.id !== itemId);
      setItems(updatedItems);
      
      // Auto-save immediately after deleting
      setSaving(true);
      try {
        const savedItems = await window.budgetAPI.saveBudgetItems(eventId, updatedItems);
        console.log('Budget item deleted and saved:', savedItems);
        onBudgetChange && onBudgetChange(savedItems);
        if (window.toast) {
          window.toast.success('Budget item deleted');
        }
      } catch (error) {
        console.error('Error saving after delete:', error);
        if (window.toast) {
          window.toast.error('Failed to save changes');
        }
      } finally {
        setSaving(false);
      }
    };

    // Calculate totals like EditBudgetForm
    const totalAllocated = items.reduce((sum, item) => sum + (parseFloat(item.allocated) || 0), 0);
    const totalSpent = items.reduce((sum, item) => sum + (parseFloat(item.spent) || 0), 0);
    const totalRemaining = totalAllocated - totalSpent;

    if (!roleCheckComplete) {
      return React.createElement('div', {
        className: 'animate-pulse bg-gray-100 h-20 rounded-lg'
      });
    }

    if (!effectiveCanViewBudget) {
      return React.createElement('div', {
        className: 'text-center py-8 text-gray-500'
      }, 'Budget information is not available for your role.');
    }

    return React.createElement('div', {
      className: 'bg-white rounded-lg shadow-sm border p-6',
      'data-name': 'budget-summary',
      'data-file': 'components/Events/BudgetSummary.js'
    }, [
      React.createElement('div', {
        key: 'header',
        className: 'flex justify-between items-start mb-6'
      }, [
        React.createElement('div', {
          key: 'title-section'
        }, [
          React.createElement('h2', {
            key: 'title',
            className: 'text-xl font-semibold text-gray-800'
          }, 'Budget Summary'),
          editingMode && React.createElement('p', {
            key: 'auto-save-info',
            className: 'text-xs text-gray-600 mt-1'
          }, '💡 Changes save automatically as you type')
        ]),
        React.createElement('div', {
          key: 'actions',
          className: 'flex flex-wrap gap-2 sm:gap-3 items-center'
        }, effectiveCanEdit ? (
          editingMode ? [
            saving && React.createElement('span', {
              key: 'saving-indicator',
              className: 'text-xs sm:text-sm text-blue-600 flex items-center gap-1'
            }, [
              React.createElement('i', { key: 'icon', className: 'fas fa-circle-notch fa-spin' }),
              React.createElement('span', { key: 'text' }, 'Saving...')
            ]),
            React.createElement('button', {
              key: 'done',
              onClick: () => setEditingMode(false),
              className: 'px-3 py-1 sm:px-4 sm:py-2 bg-green-600 text-white text-xs sm:text-sm rounded-md hover:bg-green-700 transition-colors'
            }, 'Done Editing')
          ] : React.createElement('button', {
            key: 'edit',
            onClick: handleEditClick,
            className: 'px-3 py-1 sm:px-4 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-md hover:bg-blue-700 transition-colors'
          }, 'Edit Budget')
        ) : React.createElement('div', {
          key: 'readonly',
          className: 'text-xs sm:text-sm text-gray-500'
        }, 'View-only access'))
      ]),
      
      loading ? React.createElement('div', {
        key: 'loading',
        className: 'text-center py-4'
      }, 'Loading budget...') : React.createElement('div', {
        key: 'content',
        className: 'space-y-4'
      }, [
        // Add new item form (only in editing mode)
        editingMode && React.createElement('div', {
          key: 'add-form',
          className: 'bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'
        }, [
          React.createElement('div', {
            key: 'form-header',
            className: 'flex justify-between items-center mb-3'
          }, [
            React.createElement('h3', {
              key: 'form-title',
              className: 'text-sm font-medium text-blue-900'
            }, 'Add New Budget Item'),
            React.createElement('span', {
              key: 'auto-save-note',
              className: 'text-xs text-blue-700'
            }, '✨ Only category required - auto-saves when added')
          ]),
          React.createElement('div', {
            key: 'form-fields',
            className: 'grid grid-cols-1 md:grid-cols-4 gap-3'
          }, [
            React.createElement('input', {
              key: 'category',
              type: 'text',
              placeholder: 'Category * (e.g., Venue, Catering)',
              value: newItem.category,
              onChange: (e) => setNewItem(prev => ({ ...prev, category: e.target.value })),
              className: 'px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
              required: true
            }),
            React.createElement('input', {
              key: 'description',
              type: 'text',
              placeholder: 'Description (optional)',
              value: newItem.description,
              onChange: (e) => setNewItem(prev => ({ ...prev, description: e.target.value })),
              className: 'px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
            }),
            React.createElement('input', {
              key: 'allocated',
              type: 'number',
              placeholder: 'Allocated $ (optional)',
              value: newItem.allocated,
              onChange: (e) => setNewItem(prev => ({ ...prev, allocated: e.target.value })),
              className: 'px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
              min: '0'
            }),
            React.createElement('input', {
              key: 'spent',
              type: 'number',
              placeholder: 'Spent $ (optional)',
              value: newItem.spent,
              onChange: (e) => setNewItem(prev => ({ ...prev, spent: e.target.value })),
              className: 'px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
              min: '0'
            })
          ]),
          React.createElement('button', {
            key: 'add-button',
            onClick: (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Add Item button clicked');
              handleAddItem();
            },
            disabled: !newItem.category || saving,
            className: 'mt-3 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 justify-center',
            title: !newItem.category ? 
              'Please fill in the category name' : 
              'Add and save this budget item'
          }, [
            React.createElement('i', { key: 'icon', className: 'fas fa-plus' }),
            React.createElement('span', { key: 'text' }, saving ? 'Saving...' : 'Add & Save Item')
          ])
        ]),

        // Summary totals (like EditBudgetForm)
        items.length > 0 && React.createElement('div', {
          key: 'summary-totals',
          className: 'bg-gray-50 p-4 rounded-lg mb-4'
        }, [
          React.createElement('div', {
            key: 'totals-grid',
            className: 'grid grid-cols-3 gap-4 text-center'
          }, [
            React.createElement('div', {
              key: 'total-allocated',
              className: 'bg-white p-3 rounded-lg'
            }, [
              React.createElement('div', {
                key: 'allocated-label',
                className: 'text-sm text-gray-600 mb-1'
              }, '💰 Total Allocated'),
              React.createElement('div', {
                key: 'allocated-amount',
                className: 'text-lg font-semibold text-blue-600'
              }, `$${totalAllocated.toLocaleString()}`)
            ]),
            React.createElement('div', {
              key: 'total-spent',
              className: 'bg-white p-3 rounded-lg'
            }, [
              React.createElement('div', {
                key: 'spent-label',
                className: 'text-sm text-gray-600 mb-1'
              }, '💸 Total Spent'),
              React.createElement('div', {
                key: 'spent-amount',
                className: 'text-lg font-semibold text-orange-600'
              }, `$${totalSpent.toLocaleString()}`)
            ]),
            React.createElement('div', {
              key: 'total-remaining',
              className: 'bg-white p-3 rounded-lg'
            }, [
              React.createElement('div', {
                key: 'remaining-label',
                className: 'text-sm text-gray-600 mb-1'
              }, '💵 Remaining'),
              React.createElement('div', {
                key: 'remaining-amount',
                className: `text-lg font-semibold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`
              }, `$${totalRemaining.toLocaleString()}`)
            ])
          ])
        ]),

        // Budget items table (like EditBudgetForm)
        items.length > 0 && React.createElement('div', {
          key: 'items-table',
          className: 'space-y-3'
        }, [
          // Table header
          React.createElement('div', {
            key: 'table-header',
            className: `grid gap-3 text-sm font-semibold text-gray-700 pb-3 border-b-2 border-gray-200 ${editingMode ? 'grid-cols-12' : 'grid-cols-10'}`
          }, [
            React.createElement('div', { key: 'header-category', className: 'col-span-4' }, 'Category'),
            React.createElement('div', { key: 'header-allocated', className: 'col-span-2 text-center text-blue-700' }, '💰 Allocated'),
            React.createElement('div', { key: 'header-spent', className: 'col-span-2 text-center text-orange-700' }, '💸 Spent'),
            React.createElement('div', { key: 'header-remaining', className: 'col-span-2 text-center text-green-700' }, '💵 Remaining'),
            editingMode && React.createElement('div', { key: 'header-actions', className: 'col-span-2 text-center' }, 'Actions')
          ]),
          
          // Table rows
          ...items.map(item => {
            const allocated = parseFloat(item.allocated) || 0;
            const spent = parseFloat(item.spent) || 0;
            const remaining = allocated - spent;
            
            return React.createElement('div', {
              key: item.id,
              className: `grid gap-3 items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors ${editingMode ? 'grid-cols-12' : 'grid-cols-10'}`
            }, [
              React.createElement('div', {
                key: 'item-details',
                className: 'col-span-4'
              }, [
                React.createElement('div', {
                  key: 'category',
                  className: 'font-medium text-gray-900 mb-1'
                }, item.category || item.title),
                React.createElement('div', {
                  key: 'description',
                  className: 'text-sm text-gray-600'
                }, item.description || 'No description provided')
              ]),
              React.createElement('div', {
                key: 'allocated',
                className: 'col-span-2 text-center'
              }, [
                editingMode ? React.createElement('div', { key: 'allocated-input', className: 'relative' }, [
                  React.createElement('span', { key: 'allocated-dollar', className: 'absolute inset-y-0 left-0 pl-2 flex items-center text-gray-500 text-sm' }, '$'),
                  React.createElement('input', {
                    key: 'allocated-field',
                    type: 'number',
                    value: item.allocated,
                    onChange: (e) => handleItemChange(item.id, 'allocated', e.target.value),
                    className: 'w-full pl-6 pr-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center',
                    min: '0',
                    placeholder: '0'
                  })
                ]) : React.createElement('div', {
                  key: 'allocated-display',
                  className: 'font-semibold text-blue-600'
                }, `$${allocated.toLocaleString()}`)
              ]),
              React.createElement('div', {
                key: 'spent',
                className: 'col-span-2 text-center'
              }, [
                editingMode ? React.createElement('div', { key: 'spent-input', className: 'relative' }, [
                  React.createElement('span', { key: 'spent-dollar', className: 'absolute inset-y-0 left-0 pl-2 flex items-center text-gray-500 text-sm' }, '$'),
                  React.createElement('input', {
                    key: 'spent-field',
                    type: 'number',
                    value: item.spent,
                    onChange: (e) => handleItemChange(item.id, 'spent', e.target.value),
                    className: 'w-full pl-6 pr-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm text-center',
                    min: '0',
                    placeholder: '0'
                  })
                ]) : React.createElement('div', {
                  key: 'spent-display',
                  className: 'font-semibold text-orange-600'
                }, `$${spent.toLocaleString()}`)
              ]),
              React.createElement('div', {
                key: 'remaining',
                className: 'col-span-2 text-center'
              }, React.createElement('div', {
                key: 'remaining-display',
                className: `font-semibold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`
              }, `$${remaining.toLocaleString()}`)),
              editingMode && React.createElement('div', {
                key: 'actions',
                className: 'col-span-2 text-center'
              }, React.createElement('button', {
                key: 'delete-btn',
                onClick: () => handleDeleteItem(item.id),
                className: 'w-8 h-8 bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 rounded-md text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto',
                disabled: items.length <= 1,
                title: items.length <= 1 ? "Must have at least one category" : "Delete this category"
              }, React.createElement('i', { key: 'delete-icon', className: 'fas fa-trash' })))
            ]);
          })
        ]),
        
        // Show message when no items exist
        items.length === 0 && !editingMode && React.createElement('div', {
          key: 'empty-state',
          className: 'text-center py-8 text-gray-500'
        }, [
          React.createElement('div', {
            key: 'icon',
            className: 'text-4xl mb-2'
          }, '💰'),
          React.createElement('p', {
            key: 'message',
            className: 'text-lg font-medium'
          }, 'No budget items yet'),
          React.createElement('p', {
            key: 'submessage',
            className: 'text-sm'
          }, 'Click "Edit Budget" to add your first budget item')
        ]),

        // Final totals footer (only show if there are items)
        items.length > 0 && React.createElement('div', {
          key: 'final-totals',
          className: 'flex justify-between items-center pt-4 border-t-2 border-gray-200 font-semibold text-lg'
        }, [
          React.createElement('span', { key: 'label' }, 'Total Allocated:'),
          React.createElement('span', { key: 'value', className: 'text-blue-600' }, `$${totalAllocated.toLocaleString()}`)
        ])
      ])
    ]);

  } catch (error) {
    return React.createElement('div', {
      className: 'bg-red-50 border border-red-200 rounded-lg p-4'
    }, 'Error loading budget summary');
  }
}
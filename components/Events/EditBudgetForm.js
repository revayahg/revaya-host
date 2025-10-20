// Mobile-optimized EditBudgetForm - Updated 2025-01-04
function EditBudgetForm({ event, eventId, onSave, onCancel, onTotalsChange }) {
    try {
        const defaultCategories = [
            { id: 'venue', title: 'Venue & Infrastructure', allocated: 0, spent: 0 },
            { id: 'entertainment', title: 'Entertainment & Staging', allocated: 0, spent: 0 },
            { id: 'food', title: 'Food & Beverage', allocated: 0, spent: 0 },
            { id: 'marketing', title: 'Marketing & Promotion', allocated: 0, spent: 0 },
            { id: 'security', title: 'Security & Staff', allocated: 0, spent: 0 },
            { id: 'misc', title: 'Miscellaneous', allocated: 0, spent: 0 }
        ];

        const [items, setItems] = React.useState([]);
        const [saving, setSaving] = React.useState(false);
        const [loading, setLoading] = React.useState(true);

        // Prevent modal from closing on visibility change
        React.useEffect(() => {
            const handleVisibilityChange = (e) => {
                e.preventDefault();
                e.stopPropagation();
            };

            const handleBeforeUnload = (e) => {
                // Prevent page reload if form has data
                const hasData = items.some(item => item.title || item.allocated || item.spent);
                if (hasData) {
                    e.preventDefault();
                    return '';
                }
            };

            document.addEventListener('visibilitychange', handleVisibilityChange, true);
            window.addEventListener('beforeunload', handleBeforeUnload);
            
            return () => {
                document.removeEventListener('visibilitychange', handleVisibilityChange, true);
                window.removeEventListener('beforeunload', handleBeforeUnload);
            };
        }, [items]);

        // Use either event.id or eventId parameter
        const currentEventId = event?.id || eventId;

        const totalAllocated = items.reduce((sum, item) => sum + (parseFloat(item.allocated) || 0), 0);
        const totalSpent = items.reduce((sum, item) => sum + (parseFloat(item.spent) || 0), 0);
        const remaining = totalAllocated - totalSpent;

        React.useEffect(() => {
            const loadBudgetItems = async () => {
                if (!currentEventId) {
                    setLoading(false);
                    return;
                }
                
                try {
                    setLoading(true);
                    
                    if (!window.budgetAPI) {
                        setLoading(false);
                        return;
                    }
                    
                    const budgetItems = await window.budgetAPI.getBudgetItems(currentEventId);
                    
                    if (budgetItems && budgetItems.length > 0) {
                        setItems(budgetItems);
                    } else {
                        // Use default categories if no budget items exist
                        setItems(defaultCategories);
                    }
                } finally {
                    setLoading(false);
                }
            };
            
            loadBudgetItems();
        }, [currentEventId]);

        React.useEffect(() => {
            if (onTotalsChange) {
                onTotalsChange({ totalAllocated, totalSpent, remaining });
            }
        }, [totalAllocated, totalSpent, remaining]);

        const handleItemChange = (id, field, value) => {
            // Allow empty values for all fields
            if ((field === 'allocated' || field === 'spent') && value !== '' && value < 0) return;

            setItems(prev => prev.map(item => 
                item.id === id ? { ...item, [field]: value } : item
            ));
        };

        const addItem = () => {
            console.log('Add item button clicked'); // Debug log
            const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            const newItem = { id: newId, title: '', allocated: 0, spent: 0 };
            console.log('Adding new item:', newItem); // Debug log
            setItems(prev => {
                const updated = [...prev, newItem];
                console.log('Updated items array:', updated); // Debug log
                return updated;
            });
            
            // Show success message
            if (window.toast) {
                window.toast.success('New budget category added');
            }
        };

        const removeItem = (id) => {
            if (items.length <= 1) {
                window.toast?.error('You must have at least one budget category');
                return;
            }
            setItems(prev => prev.filter(item => item.id !== id));
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            if (saving) return;

            console.log('Submitting budget form with items:', items); // Debug log

            // Check for empty titles but allow saving if user wants to save with empty titles
            const itemsWithEmptyTitles = items.filter(item => !item.title || !item.title.trim());
            if (itemsWithEmptyTitles.length > 0) {
                console.log('Found items with empty titles:', itemsWithEmptyTitles); // Debug log
                
                // Auto-fill empty titles with default names
                const updatedItems = items.map((item, index) => {
                    if (!item.title || !item.title.trim()) {
                        return { ...item, title: `Budget Category ${index + 1}` };
                    }
                    return item;
                });
                
                console.log('Auto-filled empty titles, updated items:', updatedItems); // Debug log
                setItems(updatedItems);
                
                // Continue with the updated items
                items = updatedItems;
            }

            setSaving(true);
            try {
                
                if (!window.budgetAPI) {
                    throw new Error('Budget API not available');
                }
                
                console.log('Saving budget items to API:', items); // Debug log
                
                // Use the budget API to save items
                const updatedItems = await window.budgetAPI.saveBudgetItems(currentEventId, items);
                
                console.log('Budget items saved successfully:', updatedItems); // Debug log
                
                onSave(updatedItems);
                if (window.showToast) {
                    window.showToast('Budget updated successfully', 'success');
                }
            } catch (err) {
                console.error('Error saving budget:', err); // Debug log
                const errorMessage = err.message || 'Unknown error occurred';
                if (window.showToast) {
                    window.showToast(`Failed to save budget: ${errorMessage}`, 'error');
                }
            } finally {
                setSaving(false);
            }
        };

        if (loading) {
            return (
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                    <div className="space-y-3">
                        <div className="h-12 bg-gray-200 rounded"></div>
                        <div className="h-12 bg-gray-200 rounded"></div>
                    </div>
                </div>
            );
        }

        return (
            <form onSubmit={handleSubmit} data-name="edit-budget-form" className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-sm text-gray-600">Total Allocated</div>
                            <div className="text-lg font-semibold text-blue-600">${totalAllocated.toLocaleString()}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Total Spent</div>
                            <div className="text-lg font-semibold text-orange-600">${totalSpent.toLocaleString()}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Remaining</div>
                            <div className={`text-lg font-semibold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${remaining.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-3 text-sm font-semibold text-gray-700 pb-3 border-b-2 border-gray-200">
                        <div className="col-span-5">Category</div>
                        <div className="col-span-2 text-center text-blue-700">💰 Allocated</div>
                        <div className="col-span-2 text-center text-orange-700">💸 Spent</div>
                        <div className="col-span-2 text-center text-green-700">💵 Remaining</div>
                        <div className="col-span-1 text-center"></div>
                    </div>

                    {items.map((item, index) => (
                        <div key={item.id} className={`grid grid-cols-12 gap-3 items-center p-4 rounded-lg hover:bg-gray-100 transition-colors ${index === items.length - 1 && item.title === '' ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'}`}>
                            <div className="col-span-5">
                                <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) => handleItemChange(item.id, 'title', e.target.value)}
                                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 text-sm"
                                    placeholder={item.title === '' ? "Enter category name (e.g., Venue, Catering, Entertainment)" : "Category name"}
                                />
                            </div>
                            <div className="col-span-2">
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-medium text-sm">$</span>
                                    <input
                                        type="number"
                                        value={item.allocated}
                                        onChange={(e) => handleItemChange(item.id, 'allocated', e.target.value)}
                                        className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm font-mono min-w-0"
                                        min="0"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div className="col-span-2">
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-medium text-sm">$</span>
                                    <input
                                        type="number"
                                        value={item.spent}
                                        onChange={(e) => handleItemChange(item.id, 'spent', e.target.value)}
                                        className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900 text-sm font-mono min-w-0"
                                        min="0"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div className="col-span-2 text-center">
                                <div className={`text-sm font-semibold ${(parseFloat(item.allocated) || 0) - (parseFloat(item.spent) || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ${((parseFloat(item.allocated) || 0) - (parseFloat(item.spent) || 0)).toLocaleString()}
                                </div>
                            </div>
                            <div className="col-span-1 text-center">
                                <button
                                    type="button"
                                    onClick={() => removeItem(item.id)}
                                    className="w-8 h-8 bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 rounded-md text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                    disabled={items.length <= 1}
                                    title={items.length <= 1 ? "Must have at least one category" : "Delete this category"}
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Add Category button clicked'); // Debug log
                        addItem();
                    }}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                >
                    <i className="fas fa-plus mr-2"></i>
                    Add Category
                </button>

                <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm sm:text-base order-2 sm:order-1"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm sm:text-base order-1 sm:order-2"
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Budget'}
                    </button>
                </div>
            </form>
        );
    } catch (error) {
        reportError(error);
        return null;
    }
}

window.EditBudgetForm = EditBudgetForm;

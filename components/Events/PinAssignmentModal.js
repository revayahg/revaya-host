function PinAssignmentModal({ isOpen, onClose, onSave, x, y, eventId, existingPin = null }) {
  try {
    const [notes, setNotes] = React.useState(existingPin?.notes || '');
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
      if (isOpen) {
        setNotes(existingPin?.notes || '');
      }
    }, [isOpen, existingPin]);

    const handleSave = async () => {
      try {
        setIsLoading(true);
        
        // Validate required data
        if (x === undefined || y === undefined) {
          throw new Error('Pin coordinates are required');
        }
        
        if (!eventId) {
          throw new Error('Event ID is required');
        }
        
        const pinData = {
          x: parseFloat(x),
          y: parseFloat(y),
          assignee_vendor_id: null,
          notes: notes.trim(),
          visible_to_vendor: true
        };
        
        
        await onSave(pinData);
        onClose();
      } catch (error) {
        alert(`Failed to save pin: ${error.message || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (!isOpen) return null;

    return React.createElement('div', {
      className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
      onClick: (e) => e.target === e.currentTarget && onClose()
    },
      React.createElement('div', {
        className: 'bg-white rounded-lg p-6 w-96 max-w-full mx-4'
      },
        React.createElement('h3', {
          className: 'text-lg font-semibold mb-4'
        }, existingPin ? 'Edit Pin' : 'Add Pin'),
        
        React.createElement('div', {
          className: 'mb-6'
        },
          React.createElement('label', {
            className: 'block text-sm font-medium text-gray-700 mb-2'
          }, 'Notes'),
          React.createElement('textarea', {
            value: notes,
            onChange: (e) => setNotes(e.target.value),
            placeholder: 'Add notes about this location...',
            rows: 3,
            className: 'w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500'
          })
        ),

        React.createElement('div', {
          className: 'flex justify-end space-x-3'
        },
          React.createElement('button', {
            onClick: onClose,
            disabled: isLoading,
            className: 'px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50'
          }, 'Cancel'),
          React.createElement('button', {
            onClick: handleSave,
            disabled: isLoading,
            className: 'px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50'
          }, isLoading ? 'Saving...' : 'Save Pin')
        )
      )
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.PinAssignmentModal = PinAssignmentModal;

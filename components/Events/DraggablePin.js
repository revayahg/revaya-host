function DraggablePin({ pin, onUpdate, onDelete, vendors = [], eventId, readonly = false }) {
  try {
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
    const [showButtons, setShowButtons] = React.useState(false);
    const [showTooltip, setShowTooltip] = React.useState(false);
    const [showEditModal, setShowEditModal] = React.useState(false);
    const [buttonHover, setButtonHover] = React.useState(false);
    const pinRef = React.useRef(null);
    const hideTimeout = React.useRef(null);

    const handleMouseEnter = () => {
      try {
        if (hideTimeout.current) {
          clearTimeout(hideTimeout.current);
          hideTimeout.current = null;
        }
        setShowButtons(true);
        setShowTooltip(true);
      } catch (error) {
        reportError(error);
      }
    };

    const handleMouseLeave = () => {
      try {
        if (!buttonHover) {
          hideTimeout.current = setTimeout(() => {
            setShowButtons(false);
            setShowTooltip(false);
          }, 300);
        }
      } catch (error) {
        reportError(error);
      }
    };

    const handleButtonMouseEnter = () => {
      try {
        setButtonHover(true);
        if (hideTimeout.current) {
          clearTimeout(hideTimeout.current);
          hideTimeout.current = null;
        }
      } catch (error) {
        reportError(error);
      }
    };

    const handleButtonMouseLeave = () => {
      try {
        setButtonHover(false);
        hideTimeout.current = setTimeout(() => {
          setShowButtons(false);
          setShowTooltip(false);
        }, 200);
      } catch (error) {
        reportError(error);
      }
    };

    const handleMouseDown = (e) => {
      try {
        if (readonly) return;
        
        if (e.target.closest('.pin-delete-btn') || e.target.closest('.pin-edit-btn')) {
          return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        
        const rect = pinRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height;
        
        setDragOffset({
          x: e.clientX - centerX,
          y: e.clientY - centerY
        });
      } catch (error) {
        reportError(error);
      }
    };

    const handleMouseMove = React.useCallback((e) => {
      try {
        if (!isDragging || !pinRef.current) return;

        const mapImage = document.querySelector('.map-container img');
        if (!mapImage) return;

        const mapRect = mapImage.getBoundingClientRect();
        const mouseX = e.clientX - dragOffset.x;
        const mouseY = e.clientY - dragOffset.y;
        
        const newX = ((mouseX - mapRect.left) / mapRect.width) * 100;
        const newY = ((mouseY - mapRect.top) / mapRect.height) * 100;

        const clampedX = Math.max(0, Math.min(100, newX));
        const clampedY = Math.max(0, Math.min(100, newY));

        pinRef.current.style.left = `${clampedX}%`;
        pinRef.current.style.top = `${clampedY}%`;
      } catch (error) {
        reportError(error);
      }
    }, [isDragging, dragOffset]);

    const handleMouseUp = React.useCallback(async (e) => {
      try {
        if (!isDragging || !pinRef.current || readonly || !onUpdate) return;

        const mapImage = document.querySelector('.map-container img');
        if (!mapImage) return;

        const mapRect = mapImage.getBoundingClientRect();
        const mouseX = e.clientX - dragOffset.x;
        const mouseY = e.clientY - dragOffset.y;
        
        const newX = ((mouseX - mapRect.left) / mapRect.width) * 100;
        const newY = ((mouseY - mapRect.top) / mapRect.height) * 100;

        const clampedX = Math.max(0, Math.min(100, newX));
        const clampedY = Math.max(0, Math.min(100, newY));

        await onUpdate(pin.id, { x: clampedX, y: clampedY });
        setIsDragging(false);
      } catch (error) {
        reportError(error);
        setIsDragging(false);
      }
    }, [isDragging, dragOffset, pin.id, onUpdate, readonly]);

    React.useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    React.useEffect(() => {
      return () => {
        if (hideTimeout.current) {
          clearTimeout(hideTimeout.current);
        }
      };
    }, []);

    const handleDeleteClick = async (e) => {
      try {
        if (readonly || !onDelete) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        if (window.confirm('Delete this pin?')) {
          await onDelete(pin.id);
        }
      } catch (error) {
        reportError(error);
      }
    };

    const handleEditClick = (e) => {
      try {
        if (readonly) return;
        
        e.preventDefault();
        e.stopPropagation();
        setShowEditModal(true);
      } catch (error) {
        reportError(error);
      }
    };

    const handleEditSave = async (updates) => {
      try {
        await onUpdate(pin.id, updates);
        setShowEditModal(false);
      } catch (error) {
        throw error;
      }
    };

    const assignedVendor = pin.vendor_profiles;
    const hasAssignment = pin.assignee_vendor_id || pin.notes;

    return React.createElement(React.Fragment, null,
      React.createElement('div', {
        ref: pinRef,
        className: `map-pin ${isDragging ? 'dragging' : ''}`,
        style: {
          position: 'absolute',
          left: `${pin.x}%`,
          top: `${pin.y}%`,
          transform: 'translate(-50%, -100%)',
          zIndex: isDragging ? 1000 : (showButtons ? 500 : 10),
          cursor: readonly ? 'pointer' : (isDragging ? 'grabbing' : 'grab')
        },
        onMouseDown: handleMouseDown,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave
      },
        React.createElement('svg', {
          width: '20',
          height: '26',
          viewBox: '0 0 20 26',
          className: 'map-pin-icon',
          style: { pointerEvents: 'none' }
        },
          React.createElement('path', {
            d: 'M10 0C4.48 0 0 4.48 0 10c0 7.5 10 16 10 16s10-8.5 10-16c0-5.52-4.48-10-10-10z',
            fill: isDragging ? '#3b82f6' : (hasAssignment ? '#10b981' : '#ef4444'),
            stroke: '#ffffff',
            strokeWidth: '2'
          }),
          React.createElement('circle', {
            cx: '10',
            cy: '10',
            r: '3',
            fill: '#ffffff'
          })
        ),
        
        showButtons && !isDragging && !readonly && React.createElement('div', {
          className: 'pin-actions',
          style: {
            position: 'absolute',
            top: '-14px',
            right: '-14px',
            display: 'flex',
            gap: '4px'
          },
          onMouseEnter: handleButtonMouseEnter,
          onMouseLeave: handleButtonMouseLeave
        },
          React.createElement('button', {
            className: 'pin-edit-btn',
            onClick: handleEditClick,
            onMouseDown: (e) => e.stopPropagation(),
            style: {
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: '2px solid white',
              fontSize: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              zIndex: 1001
            }
          }, '✎'),
          React.createElement('button', {
            className: 'pin-delete-btn',
            onClick: handleDeleteClick,
            onMouseDown: (e) => e.stopPropagation(),
            style: {
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              color: 'white',
              border: '2px solid white',
              fontSize: '10px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              zIndex: 1001
            }
          }, '×')
        ),

        showTooltip && hasAssignment && !isDragging && React.createElement('div', {
          className: 'pin-tooltip',
          style: {
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            zIndex: 1002,
            maxWidth: '180px'
          }
        },
          assignedVendor && React.createElement('div', { style: { fontWeight: 'bold' } }, 
            assignedVendor.company || assignedVendor.name || 'Assigned Vendor'
          ),
          pin.notes && React.createElement('div', { style: { marginTop: '2px' } }, pin.notes)
        )
      ),

      showEditModal && !readonly && React.createElement(window.PinAssignmentModal, {
        isOpen: showEditModal,
        onClose: () => setShowEditModal(false),
        onSave: handleEditSave,
        x: pin.x,
        y: pin.y,
        eventId: eventId,
        existingPin: pin
      })
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.DraggablePin = DraggablePin;

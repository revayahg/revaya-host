// Mobile-optimized EventMap - Updated 2025-01-04
function EventMap({ imageUrl, eventId, viewMode = "planner", vendorId = null, allowPinCreation = true, allowPinDragging = true }) {
  try {
    const [mapUrl, setMapUrl] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [scale, setScale] = React.useState(1);
    const [position, setPosition] = React.useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
    const [pins, setPins] = React.useState([]);
    const [vendors, setVendors] = React.useState([]);
    const [isPinMode, setIsPinMode] = React.useState(false);
    const [showAssignmentModal, setShowAssignmentModal] = React.useState(false);
    const [pendingPinCoords, setPendingPinCoords] = React.useState(null);
    const containerRef = React.useRef(null);
    const mapImageRef = React.useRef(null);

    // Clean eventId to extract pure UUID
    const cleanEventId = React.useMemo(() => {
        if (!eventId) return null;
        
        let cleaned = eventId;
        // Remove any "/edit" suffix if it exists
        if (cleaned.endsWith('/edit')) {
            cleaned = cleaned.replace('/edit', '');
        }
        
        // Remove any query parameters
        cleaned = cleaned.split('?')[0];
        
        
        return cleaned;
    }, [eventId]);

    React.useEffect(() => {
        async function loadMapAndData() {
            try {
                setLoading(true);
                
                if (imageUrl) {
                    setMapUrl(imageUrl);
                } else if (cleanEventId) {
                    const { data: eventData, error } = await window.supabaseClient
                        .from('events')
                        .select('event_map')
                        .eq('id', cleanEventId)
                        .single();

                    if (!error && eventData) {
                        setMapUrl(eventData.event_map);
                    }
                }

                if (cleanEventId) {
                    await loadPins();
                }
            } catch (error) {
            } finally {
                setLoading(false);
            }
        }

        loadMapAndData();
    }, [imageUrl, cleanEventId]);

    const loadPins = async () => {
        try {
            if (!cleanEventId || !window.PinAPI) return;
            const pinsData = await window.PinAPI.getEventPins(cleanEventId);
            setPins(pinsData || []);
        } catch (error) {
        }
    };

    const handlePinUpdate = async (pinId, updates) => {
        try {
            await window.PinAPI.updatePin(pinId, updates);
            setPins(prev => prev.map(pin => 
                pin.id === pinId ? { ...pin, ...updates } : pin
            ));
        } catch (error) {
            alert(`Failed to update pin: ${error.message}`);
        }
    };

    const handlePinDelete = async (pinId) => {
        try {
            await window.PinAPI.deletePin(pinId);
            setPins(prev => prev.filter(pin => pin.id !== pinId));
        } catch (error) {
            alert(`Failed to delete pin: ${error.message}`);
        }
    };

    const handleMapClick = async (e) => {
        try {
            if (!isPinMode || !cleanEventId || !mapImageRef.current || !allowPinCreation || viewMode === "readonly") return;
            if (e.target.closest('.map-pin')) return;

            const imageRect = mapImageRef.current.getBoundingClientRect();
            const x = ((e.clientX - imageRect.left) / imageRect.width) * 100;
            const y = ((e.clientY - imageRect.top) / imageRect.height) * 100;

            if (isNaN(x) || isNaN(y) || x < 0 || x > 100 || y < 0 || y > 100) return;

            setPendingPinCoords({ 
                x: Math.max(0, Math.min(100, x)), 
                y: Math.max(0, Math.min(100, y)) 
            });
            setShowAssignmentModal(true);
            setIsPinMode(false);
        } catch (error) {
        }
    };

    const handlePinSave = async (pinData) => {
        try {
            
            const newPin = await window.PinAPI.createPin({
                event_id: cleanEventId,
                ...pinData
            });
            
            setPins(prev => [...prev, newPin]);
            setPendingPinCoords(null);
        } catch (error) {
            alert(`Failed to save pin: ${error.message || 'Unknown error'}`);
            throw error;
        }
    };

    const resetZoom = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    if (loading) {
        return React.createElement('div', { className: 'bg-white rounded-lg p-6' },
            React.createElement('h2', { className: 'text-xl font-bold mb-4' }, 'Event Map'),
            React.createElement('div', { className: 'flex justify-center py-8' },
                React.createElement('div', { className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600' })
            )
        );
    }

    return React.createElement('div', { className: 'bg-white rounded-lg p-6' },
        React.createElement('div', { className: 'flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2' },
            React.createElement('h2', { className: 'text-lg sm:text-xl font-bold' }, 'Event Map'),
            mapUrl && React.createElement('div', { className: 'flex flex-wrap gap-1 sm:gap-2' },
                (allowPinCreation && viewMode !== "readonly") && React.createElement('button', {
                    onClick: () => setIsPinMode(!isPinMode),
                    className: `px-2 py-1 sm:px-3 rounded text-xs sm:text-sm ${isPinMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`
                }, isPinMode ? 'Cancel Pin' : 'Add Pin'),
                React.createElement('button', {
                    onClick: () => setScale(Math.min(scale + 0.2, 3)),
                    className: 'px-2 py-1 sm:px-3 bg-indigo-600 text-white rounded text-xs sm:text-sm hover:bg-indigo-700'
                }, 'Zoom In'),
                React.createElement('button', {
                    onClick: () => setScale(Math.max(scale - 0.2, 0.5)),
                    className: 'px-2 py-1 sm:px-3 bg-indigo-600 text-white rounded text-xs sm:text-sm hover:bg-indigo-700'
                }, 'Zoom Out'),
                React.createElement('button', {
                    onClick: resetZoom,
                    className: 'px-2 py-1 sm:px-3 bg-gray-600 text-white rounded text-xs sm:text-sm hover:bg-gray-700'
                }, 'Reset')
            )
        ),
        React.createElement('div', { 
            ref: containerRef,
            className: 'relative border border-gray-200 rounded-lg overflow-hidden bg-gray-100',
                style: {
                    height: '400px',
                    cursor: (isPinMode && allowPinCreation && viewMode !== "readonly") ? 'crosshair' : (isDragging ? 'grabbing' : (mapUrl ? 'grab' : 'default'))
                }
        },
            mapUrl ? React.createElement('div', {
                className: 'map-container',
                style: {
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: 'center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                    width: '100%',
                    height: '100%',
                    position: 'relative'
                }
            },
                React.createElement('img', {
                    ref: mapImageRef,
                    src: mapUrl,
                    alt: 'Event Location Map',
                    className: 'select-none w-full h-full object-contain',
                    style: { display: 'block' },
                    draggable: false,
                    onClick: (isPinMode && allowPinCreation && viewMode !== "readonly") ? handleMapClick : undefined
                }),
                pins.map(pin => 
                    React.createElement(window.DraggablePin, {
                        key: pin.id,
                        pin: pin,
                        onUpdate: (allowPinDragging && viewMode !== "readonly") ? handlePinUpdate : null,
                        onDelete: (allowPinDragging && viewMode !== "readonly") ? handlePinDelete : null,
                        vendors: vendors,
                        eventId: cleanEventId,
                        readonly: viewMode === "readonly" || !allowPinDragging
                    })
                )
            ) : React.createElement('div', {
                className: 'flex items-center justify-center h-full'
            },
                React.createElement('div', { className: 'text-center' },
                    React.createElement('i', { className: 'fas fa-map text-4xl text-gray-400 mb-4' }),
                    React.createElement('p', { className: 'text-gray-500 text-lg font-medium' }, 'No Event Map Available')
                )
            )
        ),
        React.createElement(window.PinAssignmentModal, {
            isOpen: showAssignmentModal,
            onClose: () => {
                setShowAssignmentModal(false);
                setPendingPinCoords(null);
            },
            onSave: handlePinSave,
            x: pendingPinCoords?.x,
            y: pendingPinCoords?.y,
            eventId: cleanEventId
        })
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.EventMap = EventMap;

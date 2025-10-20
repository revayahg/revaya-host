// Mobile-optimized VendorEventMap - Updated 2025-01-04
function VendorEventMap({ imageUrl, eventId, vendorId, pins = [] }) {
  try {
    const [mapUrl, setMapUrl] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [scale, setScale] = React.useState(1);
    const [position, setPosition] = React.useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
    const containerRef = React.useRef(null);
    const mapImageRef = React.useRef(null);

    React.useEffect(() => {
        async function loadMap() {
            try {
                setLoading(true);
                
                if (imageUrl) {
                    setMapUrl(imageUrl);
                } else if (eventId) {
                    const { data: eventData, error } = await window.supabaseClient
                        .from('events')
                        .select('event_map')
                        .eq('id', eventId)
                        .single();

                    if (!error && eventData) {
                        setMapUrl(eventData.event_map);
                    }
                }
            } catch (error) {
            } finally {
                setLoading(false);
            }
        }

        loadMap();
    }, [imageUrl, eventId]);

    const handleWheel = (e) => {
        try {
            e.preventDefault();
            const delta = e.deltaY * -0.01;
            const newScale = Math.min(Math.max(0.5, scale + delta), 3);
            setScale(newScale);
        } catch (error) {
            reportError(error);
        }
    };

    const handleMouseDown = (e) => {
        try {
            if (e.target.closest('.vendor-map-pin')) return;
            setIsDragging(true);
            setDragStart({
                x: e.clientX - position.x,
                y: e.clientY - position.y
            });
        } catch (error) {
            reportError(error);
        }
    };

    const handleMouseMove = (e) => {
        try {
            if (!isDragging) return;
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        } catch (error) {
            reportError(error);
        }
    };

    const handleMouseUp = () => {
        try {
            setIsDragging(false);
        } catch (error) {
            reportError(error);
        }
    };

    const resetZoom = () => {
        try {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        } catch (error) {
            reportError(error);
        }
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
            React.createElement('h2', { className: 'text-lg sm:text-xl font-bold flex items-center' },
                React.createElement('i', { className: 'fas fa-map mr-2 text-indigo-600' }),
                'Event Map & My Assignments'
            ),
            mapUrl && React.createElement('div', { className: 'flex flex-wrap gap-1 sm:gap-2' },
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
        
        pins.length > 0 && React.createElement('div', {
            className: 'mb-4 p-3 bg-green-50 border border-green-200 rounded-lg'
        },
            React.createElement('div', {
                className: 'flex items-center text-sm text-green-700'
            },
                React.createElement('i', { className: 'fas fa-map-pin mr-2' }),
                React.createElement('span', { className: 'font-medium' }, `${pins.length} location assignment${pins.length === 1 ? '' : 's'} found`),
                React.createElement('span', { className: 'ml-2 text-green-600' }, '• Hover over pins for details')
            )
        ),
        
        React.createElement('div', { 
            ref: containerRef,
            className: 'relative border border-gray-200 rounded-lg overflow-hidden bg-gray-100',
            style: { 
                height: '400px',
                cursor: isDragging ? 'grabbing' : (mapUrl ? 'grab' : 'default')
            },
            onWheel: mapUrl ? handleWheel : undefined,
            onMouseDown: mapUrl ? handleMouseDown : undefined,
            onMouseMove: mapUrl ? handleMouseMove : undefined,
            onMouseUp: mapUrl ? handleMouseUp : undefined,
            onMouseLeave: mapUrl ? handleMouseUp : undefined
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
                    draggable: false
                }),
                pins.map(pin => 
                    React.createElement(window.VendorPin, {
                        key: pin.id,
                        pin: pin,
                        isReadOnly: true
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
        )
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.VendorEventMap = VendorEventMap;

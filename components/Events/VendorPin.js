function VendorPin({ pin, isReadOnly = true }) {
  try {
    const [showTooltip, setShowTooltip] = React.useState(false);
    const pinRef = React.useRef(null);

    const assignedVendor = pin.vendor_profiles;
    const hasNotes = pin.notes && pin.notes.trim();

    return React.createElement('div', {
      ref: pinRef,
      className: 'vendor-map-pin',
      style: {
        position: 'absolute',
        left: `${pin.x}%`,
        top: `${pin.y}%`,
        transform: 'translate(-50%, -100%)',
        zIndex: showTooltip ? 500 : 10,
        cursor: 'pointer'
      },
      onMouseEnter: () => setShowTooltip(true),
      onMouseLeave: () => setShowTooltip(false)
    },
      React.createElement('svg', {
        width: '20',
        height: '26',
        viewBox: '0 0 20 26',
        className: 'vendor-pin-icon',
        style: { pointerEvents: 'none' }
      },
        React.createElement('path', {
          d: 'M10 0C4.48 0 0 4.48 0 10c0 7.5 10 16 10 16s10-8.5 10-16c0-5.52-4.48-10-10-10z',
          fill: '#10b981',
          stroke: '#ffffff',
          strokeWidth: '2'
        }),
        React.createElement('circle', {
          cx: '10',
          cy: '10',
          r: '3',
          fill: '#ffffff'
        }),
        React.createElement('text', {
          x: '10',
          y: '13',
          textAnchor: 'middle',
          fontSize: '7',
          fill: '#10b981',
          fontWeight: 'bold'
        }, 'V')
      ),

      showTooltip && React.createElement('div', {
        className: 'vendor-pin-tooltip',
        style: {
          position: 'absolute',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.9)',
          color: 'white',
          padding: '8px 10px',
          borderRadius: '6px',
          fontSize: '11px',
          minWidth: '120px',
          maxWidth: '200px',
          zIndex: 1002,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)'
        }
      },
        React.createElement('div', {
          style: { 
            fontWeight: 'bold',
            color: '#10b981',
            marginBottom: hasNotes ? '4px' : '0'
          }
        }, 'Your Assignment'),
        
        assignedVendor && React.createElement('div', {
          style: { 
            fontWeight: '600',
            marginBottom: hasNotes ? '3px' : '0'
          }
        }, assignedVendor.company || assignedVendor.name || 'Assigned Vendor'),
        
        hasNotes && React.createElement('div', {
          style: { 
            marginTop: '3px',
            padding: '3px 0',
            borderTop: '1px solid rgba(255,255,255,0.2)',
            fontStyle: 'italic',
            lineHeight: '1.3'
          }
        }, pin.notes)
      )
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.VendorPin = VendorPin;

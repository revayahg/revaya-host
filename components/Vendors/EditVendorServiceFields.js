function EditVendorServiceFields({
  services, serviceAreas, newService, setNewService, newServiceArea, setNewServiceArea,
  handleAddService, handleRemoveService, handleServiceKeyPress,
  handleAddServiceArea, handleRemoveServiceArea, handleServiceAreaKeyPress
}) {
  try {
    return React.createElement('div', { className: 'space-y-6' },
      // Service Areas section with tag-style input
      React.createElement('div', { className: 'bg-gray-50 p-6 rounded-lg' },
        React.createElement('label', { className: 'block text-sm font-semibold text-gray-800 mb-3' }, 'Service Areas'),
        React.createElement('div', { className: 'flex space-x-2 mb-4' },
          React.createElement(window.LocationAutocomplete, {
            value: newServiceArea || '',
            onChange: setNewServiceArea,
            onSelect: setNewServiceArea,
            placeholder: 'Enter a service area (e.g., Miami-Dade County, South Florida)',
            className: 'flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-indigo-500 focus:outline-none transition-colors'
          }),
          React.createElement('button', {
            type: 'button',
            onClick: handleAddServiceArea,
            className: 'px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors',
            disabled: !newServiceArea || !String(newServiceArea).trim()
          }, 'Add')
        ),
        serviceAreas.length > 0 && React.createElement('div', { className: 'flex flex-wrap gap-2' },
          serviceAreas.map((area, index) => (
            React.createElement('div', {
              key: index,
              className: 'inline-flex items-center px-3 py-2 bg-green-100 text-green-800 rounded-full text-sm'
            },
              React.createElement('span', null, area),
              React.createElement('button', {
                type: 'button',
                onClick: () => handleRemoveServiceArea(area),
                className: 'ml-2 text-green-600 hover:text-green-800 transition-colors'
              },
                React.createElement('i', { className: 'fas fa-times text-xs' })
              )
            )
          ))
        )
      ),
      // Services section with tag-style input
      React.createElement('div', { className: 'bg-gray-50 p-6 rounded-lg' },
        React.createElement('label', { className: 'block text-sm font-semibold text-gray-800 mb-3' }, 'Services'),
        React.createElement('div', { className: 'flex space-x-2 mb-4' },
          React.createElement('input', {
            type: 'text',
            value: newService || '',
            onChange: (e) => setNewService(e.target.value),
            onKeyPress: handleServiceKeyPress,
            className: 'flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-indigo-500',
            placeholder: 'Enter a service (e.g., Photography, Catering, DJ Services)'
          }),
          React.createElement('button', {
            type: 'button',
            onClick: handleAddService,
            className: 'px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors',
            disabled: !newService || !String(newService).trim()
          }, 'Add')
        ),
        services.length > 0 && React.createElement('div', { className: 'flex flex-wrap gap-2' },
          services.map((service, index) => (
            React.createElement('div', {
              key: index,
              className: 'inline-flex items-center px-3 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm'
            },
              React.createElement('span', null, service),
              React.createElement('button', {
                type: 'button',
                onClick: () => handleRemoveService(service),
                className: 'ml-2 text-indigo-600 hover:text-indigo-800 transition-colors'
              },
                React.createElement('i', { className: 'fas fa-times text-xs' })
              )
            )
          ))
        )
      )
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.EditVendorServiceFields = EditVendorServiceFields;

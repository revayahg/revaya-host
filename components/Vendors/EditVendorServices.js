function EditVendorServices({ services = [], onChange }) {
  try {
    const [newService, setNewService] = React.useState('');

    const handleAddService = () => {
      if (newService.trim()) {
        onChange([...services, newService.trim()]);
        setNewService('');
      }
    };

    const handleRemoveService = (index) => {
      const updatedServices = services.filter((_, i) => i !== index);
      onChange(updatedServices);
    };

    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddService();
      }
    };

    return (
      <div className="space-y-4" data-name="vendor-services">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newService}
            onChange={(e) => setNewService(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add a service..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-name="service-input"
          />
          <button
            type="button"
            onClick={handleAddService}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            data-name="add-service-button"
          >
            Add
          </button>
        </div>

        <div className="space-y-2" data-name="services-list">
          {services.map((service, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
              data-name="service-item"
            >
              <span className="text-gray-700">{service}</span>
              <button
                type="button"
                onClick={() => handleRemoveService(index)}
                className="text-red-500 hover:text-red-700 transition-colors"
                data-name="remove-service-button"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.EditVendorServices = EditVendorServices;

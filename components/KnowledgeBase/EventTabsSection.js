function EventTabsSection({ 
  events, 
  activeEventId, 
  setActiveEventId, 
  activeEvent, 
  handleFileUpload, 
  uploading 
}) {
  try {
    
    return (
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {events && events.length > 0 ? events.map((event) => (
              <button
                key={event.id}
                onClick={() => setActiveEventId(event.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeEventId === event.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {event.name}
                {event.access_type === 'vendor' && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Vendor
                  </span>
                )}
              </button>
            )) : (
              <div className="py-4 text-gray-500">
                No events available
              </div>
            )}
          </nav>
        </div>

        {/* Upload Section */}
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            Upload Document {activeEvent && `for ${activeEvent.name}`}
          </h2>
          <input
            type="file"
            accept=".pdf,.docx,.png,.jpg,.jpeg,.gif,.webp,image/*,application/pdf"
            disabled={uploading}
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {uploading && <p className="mt-2 text-blue-600">Uploading...</p>}
          <p className="mt-2 text-xs text-gray-500">
            Supported formats: PDF, DOCX, PNG, JPEG, GIF, WebP (Max 10MB)
          </p>
        </div>
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.EventTabsSection = EventTabsSection;

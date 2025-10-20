function VendorLinkingUI({
  searchTerm, setSearchTerm, vendors, loading, matchedVendors,
  showAssignModal, setShowAssignModal, selectedVendor, handleVendorSelect,
  handleRemoveVendor, handleConfirmAssign, eventId, user, onVendorAssigned
}) {
  try {
    return (
      <div className="space-y-6" data-name="vendor-linking-ui" data-file="components/Events/VendorLinkingUI.js">
        {/* Search Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium mb-4">Search & Invite Vendors</h3>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search vendors by name or company..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <i className="fas fa-spinner fa-spin text-gray-400"></i>
              </div>
            )}
          </div>

          {/* Search Results */}
          {vendors.length > 0 && (
            <div className="mt-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
              {vendors.map(vendor => (
                <div 
                  key={vendor.id}
                  className="p-4 border-b last:border-b-0 hover:bg-white cursor-pointer transition-colors"
                  onClick={() => handleVendorSelect(vendor)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{vendor.name || vendor.company}</h4>
                      <p className="text-sm text-gray-600">{vendor.email}</p>
                    </div>
                    <button className="text-indigo-600 hover:text-indigo-800">
                      <i className="fas fa-paper-plane mr-1"></i>
                      Invite
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Matched Vendors Section */}
        {matchedVendors.length > 0 && React.createElement(window.MatchedVendorsSection, {
          matchedVendors,
          onRemoveVendor: handleRemoveVendor
        })}

        {/* Assignment Modal */}
        {showAssignModal && selectedVendor && React.createElement(window.VendorAssignModal, {
          vendor: selectedVendor,
          eventId,
          user,
          onClose: () => {
            setShowAssignModal(false);
            setSelectedVendor(null);
          },
          onConfirmAssign: handleConfirmAssign
        })}
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.VendorLinkingUI = VendorLinkingUI;

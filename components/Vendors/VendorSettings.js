function VendorSettings({ vendor, onVisibilityChange, onSearchableToggle, onPublicToggle }) {
  try {
    return (
      <section className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Profile Visibility</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Public Profile</h4>
                <p className="text-sm text-gray-600">Make your profile visible to event organizers</p>
              </div>
              <button
                onClick={onPublicToggle}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                  vendor.isPublic ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block w-4 h-4 transform transition-transform bg-white rounded-full ${
                    vendor.isPublic ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Appear in Search</h4>
                <p className="text-sm text-gray-600">Allow organizers to find you in vendor search</p>
              </div>
              <button
                onClick={onSearchableToggle}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                  vendor.searchable ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block w-4 h-4 transform transition-transform bg-white rounded-full ${
                    vendor.searchable ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-4">Visible Information</h4>
              <div className="space-y-4">
                {Object.entries({
                  profile: 'Basic Profile Information',
                  portfolio: 'Portfolio & Images',
                  contact: 'Contact Information',
                  pricing: 'Pricing Information',
                  reviews: 'Reviews & Ratings'
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{label}</span>
                    <button
                      onClick={() => onVisibilityChange(key)}
                      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                        vendor.visibilitySettings[key] ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block w-4 h-4 transform transition-transform bg-white rounded-full ${
                          vendor.visibilitySettings[key] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.VendorSettings = VendorSettings;

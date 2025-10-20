function EditVendorFormUI(props) {
  try {
    const {
      formData, setFormData, loading, saving, error, imageProcessing,
      portfolioImages, setPortfolioImages, services, setServices,
      serviceAreas, setServiceAreas, newService, setNewService,
      newServiceArea, setNewServiceArea, socialMedia, setSocialMedia,
      vendor, setVendor, currentProfileId, MAX_PORTFOLIO_IMAGES,
      socialPlatforms, handleInputChange, handleSubmit, setImageProcessing
    } = props;

    // Ensure company field is properly initialized
    React.useEffect(() => {
      if (vendor && !formData.company && vendor.company) {
        setFormData(prev => ({
          ...prev,
          company: vendor.company
        }));
      }
    }, [vendor, formData.company, setFormData]);

    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-lg rounded-xl overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200">
              <h1 className="text-3xl font-bold text-gray-900">Edit Vendor Profile</h1>
              <p className="text-gray-600 mt-2">Update your vendor information and settings</p>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
              <div className="space-y-8">
                <window.EditVendorBasicFields 
                  formData={formData}
                  handleInputChange={handleInputChange}
                  loading={saving}
                />

                <window.EditVendorContactFields 
                  formData={formData}
                  handleInputChange={handleInputChange}
                  loading={saving}
                />

                <window.EditVendorServiceFields 
                  services={services}
                  setServices={setServices}
                  serviceAreas={serviceAreas}
                  setServiceAreas={setServiceAreas}
                  newService={newService}
                  setNewService={setNewService}
                  newServiceArea={newServiceArea}
                  setNewServiceArea={setNewServiceArea}
                  loading={saving}
                />

                <window.EditVendorPortfolioSection 
                  portfolioImages={portfolioImages}
                  setPortfolioImages={setPortfolioImages}
                  MAX_PORTFOLIO_IMAGES={MAX_PORTFOLIO_IMAGES}
                  setImageProcessing={setImageProcessing}
                  imageProcessing={imageProcessing}
                  loading={saving}
                />

                <window.EditVendorInsuranceSection 
                  vendor={vendor}
                  setVendor={setVendor}
                  loading={saving}
                />

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <i className="fas fa-exclamation-circle text-red-500 mr-2"></i>
                      <span className="text-red-700">{error}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => window.location.hash = `#/vendor/view/${currentProfileId}`}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || imageProcessing}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2"></i>
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.EditVendorFormUI = EditVendorFormUI;

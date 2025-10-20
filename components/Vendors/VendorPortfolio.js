function VendorPortfolio({ 
  vendor = {
    logoUrl: '',
    coverImageUrl: '',
    portfolioImages: []
  }, 
  onLogoChange, 
  onCoverImageChange, 
  onPortfolioImageAdd, 
  onPortfolioImageRemove 
}) {
  try {
    return (
      <section className="space-y-6" data-name="vendor-portfolio">
        <div>
          <h3 className="text-lg font-medium mb-4">Logo & Cover Image</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div data-name="logo-upload">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  {vendor.logoUrl ? (
                    <div className="relative">
                      <img
                        src={vendor.logoUrl}
                        alt="Logo preview"
                        className="mx-auto h-32 w-32 object-contain"
                        data-name="logo-preview"
                      />
                      <button
                        onClick={() => onLogoChange('')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                        data-name="remove-logo"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-600" data-name="logo-placeholder">
                      <i className="fas fa-cloud-upload-alt text-3xl"></i>
                      <p className="mt-1">Upload a logo</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div data-name="cover-upload">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cover Image
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  {vendor.coverImageUrl ? (
                    <div className="relative">
                      <img
                        src={vendor.coverImageUrl}
                        alt="Cover preview"
                        className="mx-auto h-32 w-full object-cover"
                        data-name="cover-preview"
                      />
                      <button
                        onClick={() => onCoverImageChange('')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                        data-name="remove-cover"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-600" data-name="cover-placeholder">
                      <i className="fas fa-image text-3xl"></i>
                      <p className="mt-1">Upload a cover image</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div data-name="portfolio-images">
          <h3 className="text-lg font-medium mb-4">Portfolio Images</h3>
          <window.ViewPortfolioCarousel
            images={vendor.portfolioImages || []}
          />
        </div>
      </section>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.VendorPortfolio = VendorPortfolio;

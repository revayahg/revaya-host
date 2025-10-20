function VendorPreview() {
  try {
    const [previewData, setPreviewData] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [selectedImage, setSelectedImage] = React.useState(null);
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

    React.useEffect(() => {
      try {
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
        const encodedData = urlParams.get('data');
        if (!encodedData) {
          throw new Error('No preview data found');
        }
        const decodedData = JSON.parse(decodeURIComponent(encodedData));
        setPreviewData(decodedData);
      } catch (err) {
        setError('Unable to load preview data. Please try again.');
      }
    }, []);

    const handleImageSelect = (index) => {
      setSelectedImage(previewData.portfolioImages[index]);
      setCurrentImageIndex(index);
    };

    if (error) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <i className="fas fa-exclamation-circle text-4xl"></i>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Preview Error</h1>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      );
    }

    if (!previewData) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-indigo-900 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-start max-w-6xl mx-auto">
              <div className="w-32 h-32 rounded-lg overflow-hidden bg-white mr-8 flex-shrink-0">
                {previewData.logoUrl ? (
                  <img 
                    src={previewData.logoUrl} 
                    alt="Company Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                    <i className="fas fa-store text-3xl text-indigo-300"></i>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  {previewData.businessName || 'Business Name'}
                </h1>
                <div className="flex items-center mb-4">
                  <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                    {previewData.category || 'Category'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="md:col-span-2">
              {/* About Section */}
              <section className="bg-white rounded-lg p-6 shadow-sm mb-8">
                <h2 className="text-2xl font-bold mb-4">About</h2>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {previewData.description || 'No description provided.'}
                </p>
              </section>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                {/* Portfolio Section */}
                {previewData.portfolioImages?.length > 0 && (
                  <section className="bg-white rounded-lg p-6 shadow-sm md:col-span-2">
                    <h2 className="text-2xl font-bold mb-6">Portfolio</h2>
                    <PortfolioCarousel
                      images={previewData.portfolioImages}
                      onImageClick={handleImageSelect}
                      isEditable={false}
                    />
                  </section>
                )}

                {/* Certifications Section */}
                {previewData.certifications?.length > 0 && (
                  <section className="bg-white rounded-lg p-6 shadow-sm">
                    <h2 className="text-2xl font-bold mb-6">Licenses & Certifications</h2>
                    <div className="space-y-4">
                      {previewData.certifications.map((cert, index) => (
                        <div key={index} className="certification-card">
                          <div className="flex items-start">
                            <i className="fas fa-certificate text-indigo-500 mt-1 mr-3"></i>
                            <div>
                              <h3 className="font-medium">{cert.name}</h3>
                              {cert.issuer && (
                                <p className="text-sm text-gray-600 mt-1">
                                  Issued by {cert.issuer}
                                </p>
                              )}
                              {cert.year && (
                                <p className="text-sm text-gray-500 mt-1">
                                  Expires: {cert.year}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              <section className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-6">Contact Information</h2>
                <div className="space-y-4">
                  {previewData.email && (
                    <div className="flex items-center text-gray-600">
                      <i className="fas fa-envelope w-5 mr-3"></i>
                      <span>{previewData.email}</span>
                    </div>
                  )}
                  {previewData.phone && (
                    <div className="flex items-center text-gray-600">
                      <i className="fas fa-phone w-5 mr-3"></i>
                      <span>{previewData.phone}</span>
                    </div>
                  )}
                  {previewData.website && (
                    <div className="flex items-center text-gray-600">
                      <i className="fas fa-globe w-5 mr-3"></i>
                      <span>{previewData.website}</span>
                    </div>
                  )}
                </div>

                {/* Social Media */}
                {Object.values(previewData.socialMedia || {}).some(Boolean) && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-medium mb-4">Social Media</h3>
                    <div className="flex space-x-4">
                      {previewData.socialMedia?.instagram && (
                        <a href={previewData.socialMedia.instagram} className="text-gray-600 hover:text-indigo-600">
                          <i className="fab fa-instagram fa-lg"></i>
                        </a>
                      )}
                      {previewData.socialMedia?.facebook && (
                        <a href={previewData.socialMedia.facebook} className="text-gray-600 hover:text-indigo-600">
                          <i className="fab fa-facebook fa-lg"></i>
                        </a>
                      )}
                      {previewData.socialMedia?.twitter && (
                        <a href={previewData.socialMedia.twitter} className="text-gray-600 hover:text-indigo-600">
                          <i className="fab fa-twitter fa-lg"></i>
                        </a>
                      )}
                      {previewData.socialMedia?.tiktok && (
                        <a href={previewData.socialMedia.tiktok} className="text-gray-600 hover:text-indigo-600">
                          <i className="fab fa-tiktok fa-lg"></i>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>

        {/* Image Modal */}
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button 
              className="absolute top-4 right-4 text-white text-xl hover:text-gray-300"
              aria-label="Close preview"
            >
              <i className="fas fa-times"></i>
            </button>
            
            {currentImageIndex > 0 && (
              <button
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-2xl hover:text-gray-300"
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageSelect(currentImageIndex - 1);
                }}
                aria-label="Previous image"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
            )}

            <img 
              src={selectedImage}
              alt="Portfolio preview"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={e => e.stopPropagation()}
            />

            {currentImageIndex < previewData.portfolioImages.length - 1 && (
              <button
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-2xl hover:text-gray-300"
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageSelect(currentImageIndex + 1);
                }}
                aria-label="Next image"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            )}
          </div>
        )}
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.VendorPreview = VendorPreview;

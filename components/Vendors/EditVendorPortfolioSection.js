function EditVendorPortfolioSection({ 
  portfolioImages, 
  setPortfolioImages, 
  MAX_PORTFOLIO_IMAGES, 
  setImageProcessing, 
  imageProcessing, 
  loading 
}) {
  try {
    const fileInputRef = React.useRef(null);

    const handleFileSelect = (event) => {
      const files = Array.from(event.target.files);
      if (files.length === 0) return;

      // Check if adding these files would exceed the limit
      const totalImages = portfolioImages.length + files.length;
      if (totalImages > MAX_PORTFOLIO_IMAGES) {
        window.toast?.error(`Maximum ${MAX_PORTFOLIO_IMAGES} portfolio images allowed. You can add ${MAX_PORTFOLIO_IMAGES - portfolioImages.length} more.`);
        return;
      }

      // Check file types
      const validFiles = files.filter(file => {
        if (!file.type.startsWith('image/')) {
          window.toast?.error(`${file.name} is not a valid image file`);
          return false;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          window.toast?.error(`${file.name} is too large. Maximum size is 5MB.`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      setImageProcessing(true);

      // Process files and create preview URLs
      const processFiles = validFiles.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve(e.target.result);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(processFiles).then(newImageUrls => {
        setPortfolioImages(prev => [...prev, ...newImageUrls]);
        setImageProcessing(false);
        window.toast?.success(`Added ${newImageUrls.length} portfolio image(s)`);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }).catch(error => {
        setImageProcessing(false);
        window.toast?.error('Error processing images');
        reportError(error);
      });
    };

    const handleAddImages = () => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    const handleRemoveImage = (indexToRemove) => {
      setPortfolioImages(prev => prev.filter((_, index) => index !== indexToRemove));
      window.toast?.success('Portfolio image removed');
    };

    const handleImageClick = (index) => {
      // Could implement lightbox/modal view here
    };

    const remainingSlots = MAX_PORTFOLIO_IMAGES - portfolioImages.length;

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Portfolio Images</h3>
        
        <div className="text-sm text-gray-600 mb-4">
          <p>Upload up to {MAX_PORTFOLIO_IMAGES} high-quality images showcasing your work.</p>
          <p>Supported formats: JPG, PNG, WebP. Maximum size: 5MB per image.</p>
          {portfolioImages.length > 0 && (
            <p className="mt-1">
              <span className="font-medium">{portfolioImages.length}</span> of {MAX_PORTFOLIO_IMAGES} images uploaded
              {remainingSlots > 0 && <span className="text-indigo-600"> • {remainingSlots} slots remaining</span>}
            </p>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={loading || imageProcessing}
        />

        <window.EditPortfolioCarousel
          images={portfolioImages}
          onImageClick={handleImageClick}
          onImageDelete={handleRemoveImage}
          isEditable={true}
          onAddImages={handleAddImages}
          disabled={loading || imageProcessing || remainingSlots <= 0}
        />

        {imageProcessing && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mr-2"></div>
            <span className="text-gray-600">Processing images...</span>
          </div>
        )}

        {portfolioImages.length === 0 && !imageProcessing && (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <i className="fas fa-images text-4xl text-gray-400 mb-4"></i>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No portfolio images yet</h4>
            <p className="text-gray-600 mb-4">Showcase your best work by adding portfolio images</p>
            <button
              type="button"
              onClick={handleAddImages}
              disabled={loading || imageProcessing}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center"
            >
              <i className="fas fa-plus mr-2"></i>
              Add Portfolio Images
            </button>
          </div>
        )}
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.EditVendorPortfolioSection = EditVendorPortfolioSection;

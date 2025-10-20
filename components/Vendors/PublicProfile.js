function PortfolioCarousel({ images, onImageClick }) {
  const carouselRef = React.useRef(null);
  const [showNavigation, setShowNavigation] = React.useState(false);
  const [scrollPosition, setScrollPosition] = React.useState(0);

  React.useEffect(() => {
    setShowNavigation(images.length > 4);
    
    const handleResize = () => {
      if (carouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        setScrollPosition(scrollLeft / (scrollWidth - clientWidth));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [images.length]);

  const handleScroll = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setScrollPosition(scrollLeft / (scrollWidth - clientWidth));
    }
  };

  const scrollCarousel = (direction) => {
    if (!carouselRef.current) return;

    const itemWidth = carouselRef.current.clientWidth / 4;
    const scrollAmount = direction === 'next' ? itemWidth : -itemWidth;
    
    carouselRef.current.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div className="portfolio-carousel-container">
      {showNavigation && scrollPosition > 0 && (
        <button 
          onClick={() => scrollCarousel('prev')}
          className="portfolio-nav-button prev"
          aria-label="Previous images"
        >
          <i className="fas fa-chevron-left"></i>
        </button>
      )}

      <div 
        ref={carouselRef}
        className="portfolio-carousel"
        onScroll={handleScroll}
      >
        {images.map((image, index) => (
          <div
            key={index}
            className="portfolio-item"
            onClick={() => onImageClick(index)}
          >
            <img
              src={image}
              alt={`Portfolio item ${index + 1}`}
              loading={index < 4 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>

      {showNavigation && scrollPosition < 1 && (
        <button
          onClick={() => scrollCarousel('next')}
          className="portfolio-nav-button next"
          aria-label="Next images"
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      )}
    </div>
  );
}

function PortfolioModal({ image, onClose, onPrev, onNext, hasPrev, hasNext }) {
  return (
    <div 
      className="portfolio-modal"
      onClick={onClose}
    >
      <div 
        className="portfolio-modal-content"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="portfolio-modal-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          <i className="fas fa-times"></i>
        </button>

        {hasPrev && (
          <button
            className="portfolio-modal-nav prev"
            onClick={onPrev}
            aria-label="Previous image"
          >
            <i className="fas fa-chevron-left"></i>
          </button>
        )}

        <img
          src={image}
          alt="Portfolio item full view"
          className="portfolio-modal-image"
        />

        {hasNext && (
          <button
            className="portfolio-modal-nav next"
            onClick={onNext}
            aria-label="Next image"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        )}
      </div>
    </div>
  );
}

function VendorPublicProfile({ vendorId }) {
  try {
    const [vendor, setVendor] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [selectedImage, setSelectedImage] = React.useState(null);
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

    // ... (keep existing state and useEffect code)

    const handleImageSelect = (index) => {
      setSelectedImage(vendor.portfolioImages[index]);
      setCurrentImageIndex(index);
    };

    const handlePrevImage = (e) => {
      e.stopPropagation();
      if (currentImageIndex > 0) {
        handleImageSelect(currentImageIndex - 1);
      }
    };

    const handleNextImage = (e) => {
      e.stopPropagation();
      if (currentImageIndex < vendor.portfolioImages.length - 1) {
        handleImageSelect(currentImageIndex + 1);
      }
    };

    // ... (keep existing loading and error handling code)

    return (
      <Layout>
        <article data-name="vendor-public-profile" itemScope itemType="http://schema.org/LocalBusiness">
          {/* ... (keep existing hero section code) */}

          <div className="container mx-auto px-4 py-8">
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <div className="md:col-span-2">
                {/* ... (keep existing about section code) */}

                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  {/* Portfolio Section */}
                  {vendor.portfolioImages?.length > 0 && (
                    <section className="card p-6 md:col-span-2">
                      <h2 className="text-2xl font-bold mb-6">Portfolio</h2>
                      <PortfolioCarousel
                        images={vendor.portfolioImages}
                        onImageClick={handleImageSelect}
                      />
                    </section>
                  )}

                  {/* ... (keep existing certifications section code) */}
                </div>

                {/* ... (keep existing services section code) */}
              </div>

              {/* ... (keep existing sidebar code) */}
            </div>
          </div>

          {selectedImage && (
            <PortfolioModal
              image={selectedImage}
              onClose={() => setSelectedImage(null)}
              onPrev={handlePrevImage}
              onNext={handleNextImage}
              hasPrev={currentImageIndex > 0}
              hasNext={currentImageIndex < vendor.portfolioImages.length - 1}
            />
          )}
        </article>
      </Layout>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.VendorPublicProfile = VendorPublicProfile;

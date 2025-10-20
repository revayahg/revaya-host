function EditPortfolioCarousel({ 
  images = [], 
  onImageClick, 
  onImageDelete, 
  isEditable = false,
  onAddImages,
  disabled = false
}) {
  try {
    const carouselRef = React.useRef(null);
    const [showNavigation, setShowNavigation] = React.useState(false);

    React.useEffect(() => {
      if (carouselRef.current && images.length > 0) {
        const containerWidth = carouselRef.current.clientWidth;
        const itemWidth = 200; // Approximate width of each item
        const visibleItems = Math.floor(containerWidth / itemWidth);
        setShowNavigation(images.length > visibleItems);
      }
    }, [images.length]);

    const scrollCarousel = (direction) => {
      if (!carouselRef.current) return;
      const scrollAmount = 200; // Width of one item
      carouselRef.current.scrollBy({
        left: direction === 'next' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    };

    if (!images || images.length === 0) {
      return isEditable ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
          <button
            type="button"
            onClick={onAddImages}
            disabled={disabled}
            className="inline-flex flex-col items-center justify-center p-4 text-gray-500 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-plus text-3xl mb-2"></i>
            <span className="text-sm font-medium">Add Portfolio Photos</span>
            <span className="text-xs">Up to 5 images at once</span>
          </button>
        </div>
      ) : null;
    }

    return (
      <div className="relative">
        {showNavigation && (
          <button 
            onClick={() => scrollCarousel('prev')}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50"
            style={{ marginLeft: '-16px' }}
          >
            <i className="fas fa-chevron-left text-gray-600"></i>
          </button>
        )}

        <div 
          ref={carouselRef}
          className="flex space-x-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {images.map((image, index) => (
            <div
              key={index}
              className="flex-shrink-0 relative group cursor-pointer"
              style={{ width: '180px', height: '180px' }}
              onClick={() => onImageClick?.(index)}
            >
              <img
                src={image}
                alt={`Portfolio item ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border border-gray-200 group-hover:opacity-90 transition-opacity"
                loading={index < 4 ? 'eager' : 'lazy'}
              />
              {isEditable && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageDelete?.(index);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <i className="fas fa-times text-xs"></i>
                </button>
              )}
            </div>
          ))}

          {isEditable && !disabled && (
            <div
              className="flex-shrink-0 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              style={{ width: '180px', height: '180px' }}
              onClick={onAddImages}
            >
              <div className="text-center text-gray-500">
                <i className="fas fa-plus text-2xl mb-2 block"></i>
                <span className="text-sm">Add More</span>
              </div>
            </div>
          )}
        </div>

        {showNavigation && (
          <button
            onClick={() => scrollCarousel('next')}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50"
            style={{ marginRight: '-16px' }}
          >
            <i className="fas fa-chevron-right text-gray-600"></i>
          </button>
        )}
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.EditPortfolioCarousel = EditPortfolioCarousel;

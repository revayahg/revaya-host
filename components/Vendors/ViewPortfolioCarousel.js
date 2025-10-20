function ViewPortfolioCarousel({ images, onImageSelect }) {
  try {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const imagesPerView = 3;
    const totalPages = Math.ceil(images.length / imagesPerView);

    const handlePrevious = () => {
      setCurrentIndex(prev => Math.max(0, prev - imagesPerView));
    };

    const handleNext = () => {
      setCurrentIndex(prev => Math.min(images.length - imagesPerView, prev + imagesPerView));
    };

    const visibleImages = images.slice(currentIndex, currentIndex + imagesPerView);

    return React.createElement('div', { className: 'relative' },
      // Images grid
      React.createElement('div', { className: 'grid grid-cols-3 gap-4 mb-4' },
        visibleImages.map((image, index) => (
          React.createElement('div', {
            key: currentIndex + index,
            className: 'aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity',
            onClick: () => onImageSelect(currentIndex + index)
          },
            React.createElement('img', {
              src: image,
              alt: `Portfolio item ${currentIndex + index + 1}`,
              className: 'w-full h-full object-cover',
              loading: currentIndex + index < 6 ? 'eager' : 'lazy'
            })
          )
        ))
      ),

      // Navigation controls
      images.length > imagesPerView && React.createElement('div', { className: 'flex justify-between items-center' },
        React.createElement('button', {
          onClick: handlePrevious,
          disabled: currentIndex === 0,
          className: 'flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
        },
          React.createElement('i', { className: 'fas fa-chevron-left mr-2' }),
          'Previous'
        ),

        React.createElement('span', { className: 'text-sm text-gray-600' },
          `${Math.floor(currentIndex / imagesPerView) + 1} of ${totalPages}`
        ),

        React.createElement('button', {
          onClick: handleNext,
          disabled: currentIndex + imagesPerView >= images.length,
          className: 'flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
        },
          'Next',
          React.createElement('i', { className: 'fas fa-chevron-right ml-2' })
        )
      )
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.ViewPortfolioCarousel = ViewPortfolioCarousel;

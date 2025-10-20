function VendorReviewsSection({ vendor }) {
  try {
    // Mock reviews data - in real app this would come from database
    const reviews = [
      {
        name: 'Sarah M.',
        rating: 5,
        comment: 'Excellent service! Professional and delivered exactly what was promised.'
      },
      {
        name: 'John D.',
        rating: 4,
        comment: 'Great communication throughout the project. Would recommend.'
      },
      {
        name: 'Mike R.',
        rating: 5,
        comment: 'Outstanding quality and attention to detail. Perfect for our event.'
      }
    ];

    return React.createElement('section', { className: 'bg-white rounded-lg p-6 shadow-sm' },
      React.createElement('h2', { className: 'text-xl font-bold mb-6' }, 'Customer Reviews'),
      React.createElement('div', { className: 'space-y-6' },
        reviews.map((review, index) => (
          React.createElement('div', { key: index, className: 'border-b last:border-b-0 pb-4 last:pb-0' },
            React.createElement('div', { className: 'flex items-center mb-2' },
              React.createElement('div', { className: 'text-yellow-400 flex' },
                [...Array(review.rating)].map((_, i) => (
                  React.createElement('i', { key: i, className: 'fas fa-star' })
                ))
              ),
              React.createElement('span', { className: 'ml-2 font-medium' }, review.name)
            ),
            React.createElement('p', { className: 'text-gray-600' }, review.comment)
          )
        ))
      )
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.VendorReviewsSection = VendorReviewsSection;

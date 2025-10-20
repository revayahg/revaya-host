function LoadingSpinner({ size = 'md', color = 'indigo' }) {
  try {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-8 h-8',
      lg: 'w-12 h-12'
    };

    const colorClasses = {
      indigo: 'text-indigo-600',
      white: 'text-white',
      gray: 'text-gray-600'
    };

    return (
      <div data-name="loading-spinner" className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <i className={`fas fa-spinner fa-spin ${sizeClasses[size]} ${colorClasses[color]}`}></i>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.LoadingSpinner = LoadingSpinner;

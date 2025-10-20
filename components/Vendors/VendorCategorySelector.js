function VendorCategorySelector({ selectedCategory, onCategoryChange, loading }) {
  try {
    const categories = window.VENDOR_CATEGORIES || {};
    const [expandedCategory, setExpandedCategory] = React.useState(null);

    const handleCategorySelect = (categoryName, subcategory) => {
      const fullCategory = `${categoryName} - ${subcategory.name}`;
      onCategoryChange(fullCategory);
    };

    return (
      <div className="bg-gray-50 p-6 rounded-lg">
        <label className="block text-sm font-semibold text-gray-800 mb-3">
          Vendor Category *
        </label>
        <p className="text-sm text-gray-600 mb-4">
          Select the category that best describes your services
        </p>

        {selectedCategory && (
          <div className="mb-4 p-3 bg-indigo-100 border border-indigo-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-indigo-800 font-medium">
                Selected: {selectedCategory}
              </span>
              <button
                type="button"
                onClick={() => onCategoryChange('')}
                className="text-indigo-600 hover:text-indigo-800"
                disabled={loading}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {Object.entries(categories).map(([categoryName, subcategories]) => (
            <div key={categoryName} className="border border-gray-200 rounded-lg">
              <button
                type="button"
                onClick={() => setExpandedCategory(
                  expandedCategory === categoryName ? null : categoryName
                )}
                className="w-full px-4 py-3 text-left bg-white hover:bg-gray-50 rounded-lg flex items-center justify-between"
                disabled={loading}
              >
                <span className="font-medium text-gray-800">{categoryName}</span>
                <i className={`fas fa-chevron-${expandedCategory === categoryName ? 'up' : 'down'} text-gray-400`}></i>
              </button>
              
              {expandedCategory === categoryName && (
                <div className="px-4 pb-3 bg-gray-50 rounded-b-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {subcategories.map((subcategory, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleCategorySelect(categoryName, subcategory)}
                        className="text-left px-3 py-2 text-sm bg-white hover:bg-indigo-50 border border-gray-200 rounded flex items-center space-x-2"
                        disabled={loading}
                      >
                        <span className="text-lg">{subcategory.icon}</span>
                        <span className="text-gray-700">{subcategory.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.VendorCategorySelector = VendorCategorySelector;

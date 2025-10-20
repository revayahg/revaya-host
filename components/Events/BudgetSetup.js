function BudgetSetup({ formData, onInputChange, onBudgetAllocation }) {
  try {
    const categories = [
      'Venue & Infrastructure',
      'Entertainment & Staging',
      'Food & Beverage',
      'Marketing & Promotion',
      'Security & Staff',
      'Miscellaneous'
    ];

    const totalAllocated = Object.values(formData.budgetAllocation || {}).reduce((a, b) => a + b, 0);
    const remainingBudget = (formData.totalBudget || 0) - totalAllocated;

    return (
      <div data-name="budget-setup" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div data-name="left-column">
          <div className="mb-4">
            <label htmlFor="totalBudget" className="block text-gray-700 mb-2">
              Total Budget *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-600">
                $
              </span>
              <input
                type="number"
                id="totalBudget"
                name="totalBudget"
                value={formData.totalBudget}
                onChange={onInputChange}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                min="0"
                required
              />
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Budget Overview</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Total Budget:</span>
                <span className="font-medium">${formData.totalBudget || 0}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Allocated:</span>
                <span className="font-medium">${totalAllocated}</span>
              </div>
              <div className="flex justify-between text-lg border-t pt-2 mt-2">
                <span className="text-gray-600">Remaining:</span>
                <span className={`font-medium ${remainingBudget < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${remainingBudget}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div data-name="right-column">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Budget Allocation</h3>
          
          {/* Aligned Summary Headers */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm font-medium text-gray-600">
            <div className="text-center">Allocated Amount</div>
            <div className="text-center">Progress</div>
          </div>
          
          <div className="space-y-4">
            {categories.map(category => (
              <div key={category} className="relative">
                <label htmlFor={category} className="block text-gray-700 mb-2 font-medium">
                  {category}
                </label>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-600">
                      $
                    </span>
                    <input
                      type="number"
                      id={category}
                      value={formData.budgetAllocation[category]}
                      onChange={(e) => onBudgetAllocation(category, e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      min="0"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 h-3 bg-gray-200 rounded-full">
                      <div
                        className="h-3 bg-indigo-600 rounded-full transition-all duration-300"
                        style={{
                          width: `${formData.totalBudget ? Math.min((formData.budgetAllocation[category] / formData.totalBudget) * 100, 100) : 0}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 min-w-[40px]">
                      {formData.totalBudget ? Math.round((formData.budgetAllocation[category] / formData.totalBudget) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.BudgetSetup = BudgetSetup;

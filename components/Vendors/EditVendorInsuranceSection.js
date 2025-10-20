function EditVendorInsuranceSection({ vendor, handleInsuranceChange }) {
  try {
    const insurance = vendor?.insurance || {
      provider: '',
      policyNumber: '',
      expiryDate: '',
      coverage: ''
    };

    // Format currency for display
    const formatCurrency = (value) => {
      if (!value) return '';
      
      // Remove all non-digits
      const numericValue = value.toString().replace(/[^\d]/g, '');
      if (!numericValue) return '';
      
      // Convert to number and format with commas
      const number = parseInt(numericValue);
      return '$' + number.toLocaleString();
    };

    // Handle coverage input change with formatting
    const handleCoverageChange = (value) => {
      const formattedValue = formatCurrency(value);
      handleInsuranceChange('coverage', formattedValue);
    };

    return (
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium mb-4">Insurance Information</h3>
        <p className="text-sm text-gray-600 mb-4">
          Provide your business insurance details to build trust with event organizers.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="ins-provider" className="block text-sm font-medium text-gray-700 mb-1">
              Insurance Provider
            </label>
            <input
              id="ins-provider"
              name="ins-provider"
              type="text"
              autoComplete="off"
              value={insurance.provider || ''}
              onChange={(e) => handleInsuranceChange('provider', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., State Farm, Allstate, Progressive"
            />
          </div>
          
          <div>
            <label htmlFor="ins-policy" className="block text-sm font-medium text-gray-700 mb-1">
              Policy Number
            </label>
            <input
              id="ins-policy"
              name="ins-policy"
              type="text"
              autoComplete="off"
              value={insurance.policyNumber || ''}
              onChange={(e) => handleInsuranceChange('policyNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter policy number"
            />
          </div>
          
          <div>
            <label htmlFor="ins-expiry" className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date
            </label>
            <input
              id="ins-expiry"
              name="ins-expiry"
              type="date"
              autoComplete="off"
              value={insurance.expiryDate || ''}
              onChange={(e) => handleInsuranceChange('expiryDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label htmlFor="ins-coverage" className="block text-sm font-medium text-gray-700 mb-1">
              Coverage Amount
            </label>
            <input
              id="ins-coverage"
              name="ins-coverage"
              type="text"
              autoComplete="off"
              value={insurance.coverage || ''}
              onChange={(e) => handleCoverageChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., $1,000,000, $2,000,000"
            />
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start">
            <i className="fas fa-info-circle text-blue-500 mt-1 mr-2"></i>
            <div className="text-sm text-blue-700">
              <p className="font-medium">Why provide insurance information?</p>
              <p>Event organizers often require vendors to have liability insurance. Providing this information upfront helps build trust and can expedite the booking process.</p>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.EditVendorInsuranceSection = EditVendorInsuranceSection;

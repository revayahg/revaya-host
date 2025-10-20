// This component has been deprecated as per requirements
// Only insurance functionality is maintained in the application
// Certifications and licenses sections have been removed

function VendorCertifications({ vendor = { insurance: {} }, onInsuranceChange }) {
  try {
    const insurance = vendor.insurance || {};
    
    return (
      <section className="space-y-6" data-name="vendor-insurance-only">
        <div data-name="insurance-section">
          <h3 className="text-lg font-medium mb-4">Insurance Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Insurance Provider
              </label>
              <input
                type="text"
                value={insurance.provider || ''}
                onChange={(e) => onInsuranceChange && onInsuranceChange('provider', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-name="insurance-provider"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Policy Number
              </label>
              <input
                type="text"
                value={insurance.policyNumber || ''}
                onChange={(e) => onInsuranceChange && onInsuranceChange('policyNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-name="insurance-policy-number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                value={insurance.expiryDate || ''}
                onChange={(e) => onInsuranceChange && onInsuranceChange('expiryDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-name="insurance-expiry-date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coverage Amount
              </label>
              <input
                type="text"
                value={insurance.coverage || ''}
                onChange={(e) => onInsuranceChange && onInsuranceChange('coverage', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., $1,000,000"
                data-name="insurance-coverage"
              />
            </div>
          </div>
        </div>
      </section>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.VendorCertifications = VendorCertifications;

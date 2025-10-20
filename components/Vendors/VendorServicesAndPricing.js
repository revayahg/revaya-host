function VendorServicesAndPricing({ vendor, onServiceChange, onPricingChange, onServiceRemove, onServiceAdd }) {
  try {
    return (
      <section className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Services</h3>
          <div className="space-y-4">
            {vendor.services.map((service, index) => (
              <div key={index} className="flex items-center space-x-4">
                <input
                  type="text"
                  value={service}
                  onChange={(e) => onServiceChange(index, e.target.value)}
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-md"
                />
                <button
                  onClick={() => onServiceRemove(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            ))}
            <button
              onClick={onServiceAdd}
              className="text-indigo-600 hover:text-indigo-700"
            >
              <i className="fas fa-plus mr-2"></i>
              Add Service
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-4">Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rate Type
              </label>
              <select
                value={vendor.pricing.rateType}
                onChange={(e) => onPricingChange('rateType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="hourly">Hourly</option>
                <option value="fixed">Fixed</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Rate
              </label>
              <input
                type="number"
                value={vendor.pricing.baseRate}
                onChange={(e) => onPricingChange('baseRate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="0.00"
              />
            </div>
            {vendor.pricing.rateType === 'hourly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Hours
                </label>
                <input
                  type="number"
                  value={vendor.pricing.minimumHours}
                  onChange={(e) => onPricingChange('minimumHours', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0"
                />
              </div>
            )}
          </div>

          <div className="mt-4 space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={vendor.pricing.depositRequired}
                onChange={(e) => onPricingChange('depositRequired', e.target.checked)}
                className="h-4 w-4 text-indigo-600 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Deposit Required
              </label>
            </div>
            {vendor.pricing.depositRequired && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deposit Amount
                </label>
                <input
                  type="number"
                  value={vendor.pricing.depositAmount}
                  onChange={(e) => onPricingChange('depositAmount', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cancellation Policy
            </label>
            <textarea
              value={vendor.pricing.cancellationPolicy}
              onChange={(e) => onPricingChange('cancellationPolicy', e.target.value)}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            ></textarea>
          </div>
        </div>
      </section>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.VendorServicesAndPricing = VendorServicesAndPricing;

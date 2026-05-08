function VendorBasicInfo({ vendor, onInputChange, onSocialMediaChange }) {
  try {
    return (
      <section className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name *
            </label>
            <input
              type="text"
              name="businessName"
              value={vendor.businessName}
              onChange={onInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              name="category"
              value={vendor.category}
              onChange={onInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Select a category</option>
              {Object.entries(window.VENDOR_CATEGORIES).map(([category]) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={vendor.email}
              onChange={onInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={vendor.phone}
              onChange={onInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="url"
              name="website"
              value={vendor.website}
              onChange={onInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="https://"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={vendor.location}
              onChange={onInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={vendor.description}
            onChange={onInputChange}
            rows="4"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          ></textarea>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Social Media</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(vendor.socialMedia).map(([platform, value]) => (
              <div key={platform}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                  {platform}
                </label>
                <input
                  type="url"
                  value={value}
                  onChange={(e) => onSocialMediaChange(platform, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder={`${platform} URL`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.VendorBasicInfo = VendorBasicInfo;

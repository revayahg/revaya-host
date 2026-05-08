function VendorBasicInfo({ vendor, onInputChange, onSocialMediaChange }) {
  try {
    const normalizeUrl = (value) => {
      if (!value || !value.trim()) return value;
      const v = value.trim();
      if (/^https?:\/\//i.test(v)) return v;
      return `https://${v}`;
    };

    const handleUrlBlur = (e) => {
      const normalized = normalizeUrl(e.target.value);
      if (normalized !== e.target.value) {
        onInputChange({ target: { name: e.target.name, value: normalized } });
      }
    };

    const handleSocialBlur = (platform, value) => {
      const normalized = normalizeUrl(value);
      if (normalized !== value) onSocialMediaChange(platform, normalized);
    };

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
              type="text"
              name="website"
              value={vendor.website}
              onChange={onInputChange}
              onBlur={handleUrlBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="https://yourwebsite.com"
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
                  type="text"
                  value={value}
                  onChange={(e) => onSocialMediaChange(platform, e.target.value)}
                  onBlur={(e) => handleSocialBlur(platform, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder={`${platform} URL or username`}
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

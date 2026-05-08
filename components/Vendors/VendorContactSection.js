function VendorContactSection({ vendor }) {
  try {
    const socialMedia = Array.isArray(vendor.social_media) ? vendor.social_media : [];

    const formatPhoneNumber = (phone) => {
      if (!phone) return phone;
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
      }
      return phone;
    };

    const getSocialIcon = (platform) => {
      const platformLower = platform.toLowerCase();
      const iconMap = {
        'facebook': 'fab fa-facebook',
        'instagram': 'fab fa-instagram',
        'twitter': 'fab fa-twitter',
        'linkedin': 'fab fa-linkedin',
        'website': 'fas fa-globe',
        'other': 'fas fa-link'
      };
      return iconMap[platformLower] || 'fas fa-link';
    };

    return (
      <section className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Contact Us</h2>
        
        {/* Contact Information */}
        <div className="mb-6 space-y-4 border-b pb-6">
          {vendor.phone && (
            <div className="preferred-contact bg-blue-50 p-4 rounded-lg mb-4">
              <h3 className="font-semibold text-blue-800 mb-2">
                <i className="fas fa-phone-alt mr-2"></i>
                Preferred Contact Method
              </h3>
              <p className="text-blue-700 text-lg">{formatPhoneNumber(vendor.phone)}</p>
            </div>
          )}
          
          {vendor.email && (
            <div>
              <h3 className="font-medium text-gray-700">Email</h3>
              <p className="text-gray-600">{vendor.email}</p>
            </div>
          )}
          
          {socialMedia.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Social Media</h3>
              <div className="flex flex-wrap gap-2">
                {socialMedia.map((social, index) => (
                  <a
                    key={index}
                    href="#"
                    className="flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 hover:text-blue-600 transition-colors"
                    title={`${social.platform}: ${social.handle}`}
                  >
                    <i className={`${getSocialIcon(social.platform)} mr-2`}></i>
                    <span className="text-sm">{social.handle}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contact Information Note */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">
            <i className="fas fa-info-circle mr-2"></i>
            How to Connect
          </h3>
          <p className="text-blue-700 text-sm">
            To message this vendor, invite them to one of your events. All communication happens within event groups to ensure organized project management.
          </p>
        </div>
      </section>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.VendorContactSection = VendorContactSection;

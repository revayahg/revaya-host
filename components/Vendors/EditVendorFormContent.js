function EditVendorFormContent({ vendor, onSave, onCancel }) {
  try {
    const [formData, setFormData] = React.useState({});
    const [socialMedia, setSocialMedia] = React.useState([]);
    const [services, setServices] = React.useState([]);
    const [serviceAreas, setServiceAreas] = React.useState([]);
    const [portfolioImages, setPortfolioImages] = React.useState([]);
    const [newService, setNewService] = React.useState('');
    const [newServiceArea, setNewServiceArea] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [imageProcessing, setImageProcessing] = React.useState(false);

    const socialPlatforms = ['Instagram', 'Facebook', 'Twitter', 'LinkedIn', 'Website', 'Other'];
    const MAX_PORTFOLIO_IMAGES = 10;

    React.useEffect(() => {
      if (vendor) {
        setFormData({
          company: vendor.company || '',
          name: vendor.name || '',
          email: vendor.email || '',
          phone: vendor.phone || '',
          bio: vendor.bio || '',
          category: vendor.category || '',
          is_public: vendor.is_public || false,
          profile_picture_url: vendor.profile_picture_url || null,
          insurance: vendor.insurance || {
            provider: '',
            policyNumber: '',
            expiryDate: '',
            coverage: ''
          }
        });
        setSocialMedia(vendor.social_media || []);
        setServices(vendor.services || []);
        setServiceAreas(vendor.service_areas || []);
        setPortfolioImages(vendor.portfolio_images || []);
      }
    }, [vendor]);

    const handleInputChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    };

    const handleInsuranceChange = (field, value) => {
      setFormData(prev => ({
        ...prev,
        insurance: {
          ...prev.insurance,
          [field]: value
        }
      }));
    };

    const handleAddSocialMedia = () => {
      setSocialMedia(prev => [...prev, { platform: 'Instagram', handle: '' }]);
    };

    const handleSocialMediaChange = (index, field, value) => {
      setSocialMedia(prev => 
        prev.map((item, i) => 
          i === index ? { ...item, [field]: value } : item
        )
      );
    };

    const handleRemoveSocialMedia = (index) => {
      setSocialMedia(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddService = () => {
      if (newService.trim() && !services.includes(newService.trim())) {
        setServices(prev => [...prev, newService.trim()]);
        setNewService('');
      }
    };

    const handleRemoveService = (service) => {
      setServices(prev => prev.filter(s => s !== service));
    };

    const handleServiceKeyPress = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddService();
      }
    };

    const handleAddServiceArea = () => {
      if (newServiceArea.trim() && !serviceAreas.includes(newServiceArea.trim())) {
        setServiceAreas(prev => [...prev, newServiceArea.trim()]);
        setNewServiceArea('');
      }
    };

    const handleRemoveServiceArea = (area) => {
      setServiceAreas(prev => prev.filter(a => a !== area));
    };

    const handleServiceAreaKeyPress = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddServiceArea();
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        setLoading(true);
        setError(null);

        const updatedData = {
          ...formData,
          social_media: socialMedia.filter(sm => sm.handle.trim() !== ''),
          services: services,
          service_areas: serviceAreas,
          portfolio_images: portfolioImages
        };

        await onSave(updatedData);
      } catch (err) {
        setError(err.message);
        reportError(err);
      } finally {
        setLoading(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-8">
        <window.EditVendorBasicFields 
          formData={formData}
          handleInputChange={handleInputChange}
          loading={loading}
        />

        <window.EditVendorContactFields 
          formData={formData}
          socialMedia={socialMedia}
          socialPlatforms={socialPlatforms}
          handleInputChange={handleInputChange}
          handleAddSocialMedia={handleAddSocialMedia}
          handleSocialMediaChange={handleSocialMediaChange}
          handleRemoveSocialMedia={handleRemoveSocialMedia}
        />

        <window.EditVendorServiceFields
          services={services}
          serviceAreas={serviceAreas}
          newService={newService}
          setNewService={setNewService}
          newServiceArea={newServiceArea}
          setNewServiceArea={setNewServiceArea}
          handleAddService={handleAddService}
          handleRemoveService={handleRemoveService}
          handleServiceKeyPress={handleServiceKeyPress}
          handleAddServiceArea={handleAddServiceArea}
          handleRemoveServiceArea={handleRemoveServiceArea}
          handleServiceAreaKeyPress={handleServiceAreaKeyPress}
        />

        <window.EditVendorPortfolioSection
          portfolioImages={portfolioImages}
          setPortfolioImages={setPortfolioImages}
          MAX_PORTFOLIO_IMAGES={MAX_PORTFOLIO_IMAGES}
          setImageProcessing={setImageProcessing}
          imageProcessing={imageProcessing}
          loading={loading}
        />

        <window.EditVendorInsuranceSection 
          vendor={formData}
          handleInsuranceChange={handleInsuranceChange}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <i className="fas fa-exclamation-circle text-red-500 mr-2"></i>
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || imageProcessing}
            className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2"></i>
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.EditVendorFormContent = EditVendorFormContent;

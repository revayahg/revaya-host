function CreateVendorProfileForm() {
  try {
    const [formData, setFormData] = React.useState({
      company: '',
      name: '',
      email: '',
      phone: '',
      bio: '',
      category: '',
      is_public: true,
      profile_picture_url: null
    });

    const [socialMedia, setSocialMedia] = React.useState([]);
    const [services, setServices] = React.useState([]);
    const [serviceAreas, setServiceAreas] = React.useState([]);
    const [portfolioImages, setPortfolioImages] = React.useState([]);
    const [insurance, setInsurance] = React.useState({
      provider: '',
      policyNumber: '',
      expiryDate: '',
      coverage: ''
    });
    const [newService, setNewService] = React.useState('');
    const [newServiceArea, setNewServiceArea] = React.useState('');
    const [profilePicturePreview, setProfilePicturePreview] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [imageProcessing, setImageProcessing] = React.useState(false);
    const context = React.useContext(window.AuthContext || React.createContext({}));
    const { user } = context;

    const socialPlatforms = ['Instagram', 'Facebook', 'Twitter', 'LinkedIn', 'Website', 'Other'];
    const MAX_PORTFOLIO_IMAGES = 10;

    const handleInputChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    };

    const handleCategoryChange = (category) => {
      setFormData(prev => ({
        ...prev,
        category: category
      }));
    };

    const handleProfilePictureChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setProfilePicturePreview(e.target.result);
        };
        reader.readAsDataURL(file);
      }
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

    const handleInsuranceChange = (field, value) => {
      setInsurance(prev => ({
        ...prev,
        [field]: value
      }));
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        setLoading(true);
        setError(null);

        if (!user) {
          throw new Error('No authenticated user found');
        }

        if (!formData.company.trim()) {
          throw new Error('Company/Vendor Name is required');
        }

        if (!formData.category.trim()) {
          throw new Error('Vendor Category is required');
        }

        const profileData = {
          user_id: user.id,
          company: formData.company,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          bio: formData.bio,
          category: formData.category,
          services: services,
          service_areas: serviceAreas,
          portfolio_images: portfolioImages,
          social_media: socialMedia.filter(sm => sm.handle.trim() !== ''),
          insurance: insurance,
          profile_picture_url: profilePicturePreview,
          is_public: formData.is_public,
          created_at: new Date().toISOString()
        };

        const { data, error: supabaseError } = await window.supabaseClient
          .from('vendor_profiles')
          .insert([profileData])
          .select()
          .single();

        if (supabaseError) throw supabaseError;

        window.toast?.success('Vendor profile created successfully');
        window.location.hash = `#/vendor/view/${data.id}`;
      } catch (err) {
        setError(err.message);
        window.toast?.error('Failed to create profile');
        reportError(err);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Vendor Profile</h1>
            <p className="text-gray-600">Set up your vendor profile to start connecting with event organizers.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-8 bg-white shadow-lg rounded-xl p-8">
            <window.EditVendorBasicFields 
              formData={formData}
              handleInputChange={handleInputChange}
              handleCategoryChange={handleCategoryChange}
              loading={loading}
              isCreate={true}
              profilePicturePreview={profilePicturePreview}
              handleProfilePictureChange={handleProfilePictureChange}
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
              vendor={{ insurance }}
              handleInsuranceChange={handleInsuranceChange}
            />

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_public"
                  name="is_public"
                  checked={formData.is_public}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="is_public" className="ml-2 block text-sm text-gray-700">
                  Make profile publicly visible in vendor search
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-red-600 text-sm flex items-center" role="alert">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  {error}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => window.location.hash = '#/dashboard'}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors font-medium"
                data-name="cancel-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.company || !formData.category || imageProcessing}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium transition-colors"
                data-name="submit-button"
              >
                {loading ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating...
                  </span>
                ) : (
                  <>
                    <i className="fas fa-plus mr-2"></i>
                    Create Profile
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  } catch (error) {
    reportError(error);
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-5xl mb-4">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
        <p className="text-gray-600">Please try again later</p>
      </div>
    );
  }
}

window.CreateVendorProfileForm = CreateVendorProfileForm;
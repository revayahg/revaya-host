function ViewVendorProfile({ vendorId }) {
  try {
    const [vendor, setVendor] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const context = React.useContext(window.AuthContext || React.createContext({}));
    const { user } = context;

    // Clean vendorId to extract pure UUID
    const cleanVendorId = React.useMemo(() => {
      if (!vendorId) return null;
      
      // Remove any "view/" prefix if it exists
      let cleaned = vendorId;
      if (cleaned.includes('view/')) {
        cleaned = cleaned.split('view/')[1];
      }
      
      // Extract UUID pattern (remove any query parameters)
      cleaned = cleaned.split('?')[0];
      
      
      return cleaned;
    }, [vendorId]);

    React.useEffect(() => {
      loadVendorProfile();
    }, [cleanVendorId]);

    const loadVendorProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error: supabaseError } = await window.supabaseClient
          .from('vendor_profiles')
          .select('*')
          .eq('id', cleanVendorId)
          .single();
          
        if (supabaseError) {
          throw supabaseError;
        }
        if (!data) throw new Error('Vendor profile not found');
        
        setVendor(data);
      } catch (err) {
        setError(err.message);
        reportError(err);
      } finally {
        setLoading(false);
      }
    };

    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      );
    }

    if (error || !vendor) {
      return (
        <div className="text-center py-12">
          <div className="text-red-600 text-5xl mb-4">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
          <p className="text-gray-600">{error || 'Unable to load vendor profile'}</p>
          <button 
            onClick={() => window.location.hash = '#/dashboard'}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Back to Dashboard
          </button>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Logo/Profile Picture */}
              <div className="md:w-1/4">
                <div className="w-full aspect-square rounded-lg overflow-hidden">
                  {vendor.profile_picture_url ? (
                    <img 
                      src={vendor.profile_picture_url}
                      alt={`${vendor.company || vendor.name}'s profile`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="w-full h-full bg-gray-100 flex items-center justify-center"
                    style={{ display: vendor.profile_picture_url ? 'none' : 'flex' }}
                  >
                    <i className="fas fa-user-circle text-6xl text-gray-400"></i>
                  </div>
                </div>
              </div>
              
              {/* Business Info */}
              <div className="md:w-3/4">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">{vendor.company || vendor.name || 'Vendor Name'}</h1>
                    {vendor.category && (
                      <div className="mb-4">
                        <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                          {vendor.category}
                        </span>
                      </div>
                    )}
                    {vendor.name && vendor.company && (
                      <p className="text-lg text-gray-600 mb-4">Contact: {vendor.name}</p>
                    )}
                  </div>
                  {user && user.id === vendor.user_id ? (
                    <div className="flex gap-3">
                      <a
                        href={`#/vendor/edit/${vendor.id}`}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
                      >
                        <div className="icon-settings text-lg mr-2"></div>
                        Manage
                      </a>
                      <button
                        onClick={() => {
                          // Navigate to edit page with availability tab
                          window.location.hash = `#/vendor/edit/${vendor.id}`;
                          // Use setTimeout to ensure the page loads before setting the tab
                          setTimeout(() => {
                            const url = new URL(window.location);
                            url.searchParams.set('tab', 'availability');
                            window.history.pushState({}, '', url.toString());
                            // Force tab change by dispatching a custom event
                            window.dispatchEvent(new Event('tabchange'));
                          }, 100);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                      >
                        <div className="icon-calendar text-lg"></div>
                      </button>
                    </div>
                  ) : (
                    <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-200">
                      Request Quote
                    </button>
                  )}
                </div>
                
                {/* Business Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="font-semibold text-gray-700">Service Areas</div>
                    <div className="text-gray-600">
                      {vendor.service_areas && vendor.service_areas.length > 0 
                        ? vendor.service_areas.join(', ') 
                        : 'Local & Regional'}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="font-semibold text-gray-700">Experience</div>
                    <div className="text-gray-600">{vendor.years_of_experience || '5+'} Years</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="font-semibold text-gray-700">Services</div>
                    <div className="text-gray-600">
                      {vendor.services && vendor.services.length > 0 
                        ? `${vendor.services.length} Services` 
                        : 'No services listed'}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="font-semibold text-gray-700">Portfolio</div>
                    <div className="text-gray-600">{vendor.portfolio_images?.length || 0} Images</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              {/* Business Description */}
              {vendor.bio && (
                <section className="bg-white rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-bold mb-4">About Our Business</h2>
                  <p className="text-gray-600 leading-relaxed">{vendor.bio}</p>
                </section>
              )}

              {/* Services Section */}
              {vendor.services && vendor.services.length > 0 && (
                <window.VendorServicesSection vendor={vendor} />
              )}

              {/* Portfolio Section */}
              {vendor.portfolio_images && vendor.portfolio_images.length > 0 && (
                <section className="bg-white rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-bold mb-6">Portfolio</h2>
                  <window.ViewPortfolioCarousel
                    images={vendor.portfolio_images}
                  />
                </section>
              )}

              {/* Insurance Information */}
              {vendor.insurance && vendor.insurance.provider && (
                <section className="bg-white rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-bold mb-4 flex items-center">
                    <i className="fas fa-shield-alt text-blue-500 mr-2"></i>
                    Insurance Information
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Provider</div>
                      <div className="text-gray-900">{vendor.insurance.provider}</div>
                    </div>
                    {vendor.insurance.coverage && (
                      <div>
                        <div className="text-sm font-medium text-gray-700">Coverage</div>
                        <div className="text-gray-900">{vendor.insurance.coverage}</div>
                      </div>
                    )}
                    {vendor.insurance.expiryDate && (
                      <div>
                        <div className="text-sm font-medium text-gray-700">Valid Until</div>
                        <div className="text-gray-900">
                          {new Date(vendor.insurance.expiryDate).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
            
            <div className="space-y-6">
              <window.VendorContactSection vendor={vendor} />
              <window.VendorAvailabilityCalendar vendorId={vendor.id} />
            </div>
          </div>
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

window.ViewVendorProfile = ViewVendorProfile;

function EditVendorProfileForm({ vendorId }) {
  try {
    const [vendor, setVendor] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [activeTab, setActiveTab] = React.useState('profile');
    const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
    const context = React.useContext(window.AuthContext || React.createContext({}));
    const { user } = context;

    // Create unique storage key for this vendor profile
    const storageKey = React.useMemo(() => 
      vendorId ? `edit-vendor-${vendorId}-${user?.id}` : null, 
      [vendorId, user?.id]
    );

    // Load draft from localStorage on component mount
    React.useEffect(() => {
      if (storageKey) {
        const savedDraft = localStorage.getItem(storageKey);
        if (savedDraft) {
          try {
            const draftData = JSON.parse(savedDraft);
            setVendor(prev => prev ? { ...prev, ...draftData } : draftData);
            setHasUnsavedChanges(true);
          } catch (e) {
          }
        }
      }
    }, [storageKey]);

    // Save draft to localStorage whenever vendor data changes
    React.useEffect(() => {
      if (storageKey && hasUnsavedChanges && vendor && Object.keys(vendor).length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(vendor));
      }
    }, [vendor, storageKey, hasUnsavedChanges]);

    React.useEffect(() => {
      if (vendorId && user) {
        loadVendorProfile();
      }
    }, [vendorId, user]);

    const loadVendorProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: supabaseError } = await window.supabaseClient
          .from('vendor_profiles')
          .select('*')
          .eq('id', vendorId)
          .single();

        if (supabaseError) throw supabaseError;
        if (!data) throw new Error('Vendor profile not found');

        // Check if user owns this profile
        if (data.user_id !== user.id) {
          throw new Error('You do not have permission to edit this profile');
        }

        // Merge saved draft with fresh vendor data
        const savedDraft = storageKey ? localStorage.getItem(storageKey) : null;
        if (savedDraft && hasUnsavedChanges) {
          try {
            const draftData = JSON.parse(savedDraft);
            setVendor({ ...data, ...draftData });
          } catch (e) {
            setVendor(data);
          }
        } else {
          setVendor(data);
        }
      } catch (err) {
        setError(err.message);
        reportError(err);
      } finally {
        setLoading(false);
      }
    };

    const handleInputChange = (field, value) => {
      setVendor(prev => ({ ...prev, [field]: value }));
      setHasUnsavedChanges(true);
    };

    const handleSave = async (updatedData) => {
      try {
        const { data, error: saveError } = await window.supabaseClient
          .from('vendor_profiles')
          .update({
            ...updatedData,
            updated_at: new Date().toISOString()
          })
          .eq('id', vendorId)
          .select()
          .single();

        if (saveError) throw saveError;

        // Clear saved draft after successful save
        if (storageKey) {
          localStorage.removeItem(storageKey);
        }
        setHasUnsavedChanges(false);

        window.toast?.success('Profile updated successfully');
        window.location.hash = `#/vendor/view/${vendorId}`;
      } catch (err) {
        window.toast?.error('Failed to save profile');
        throw err;
      }
    };

    const handleCancel = () => {
      window.location.hash = `#/vendor/view/${vendorId}`;
    };

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="icon-loader text-4xl text-indigo-600 mb-4"></div>
            <p className="text-gray-600">Loading vendor profile...</p>
          </div>
        </div>
      );
    }

    if (error || !vendor) {
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="bg-white border-b">
            <div className="container mx-auto px-4 py-6">
              <h1 className="text-2xl font-bold text-gray-900">Error Loading Profile</h1>
            </div>
          </div>
          <div className="container mx-auto px-4 py-8">
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <p className="text-red-700">{error || 'Profile not found'}</p>
              <button 
                onClick={() => window.location.hash = '#/dashboard'}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    const tabs = [
      { id: 'profile', label: 'Profile Details', icon: 'user' },
      { id: 'availability', label: 'Availability Calendar', icon: 'calendar' }
    ];

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold text-gray-900">Edit Vendor Profile</h1>
                  {hasUnsavedChanges && (
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      Unsaved changes
                    </span>
                  )}
                </div>
                <p className="text-gray-600">{vendor.company || vendor.name}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => window.location.hash = `#/vendor/view/${vendorId}`}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  View Profile
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4">
            <nav className="flex space-x-8">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className={`icon-${tab.icon} text-lg mr-2`}></div>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="container mx-auto px-4 py-6">
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <window.EditVendorFormContent 
                  vendor={vendor}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          )}

          {activeTab === 'availability' && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="text-center py-12">
                  <div className="icon-calendar text-6xl text-gray-300 mb-4"></div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Availability Calendar
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Manage your availability and busy dates for event bookings
                  </p>
                  <div className="text-sm text-gray-400">
                    Calendar functionality coming soon...
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.EditVendorProfileForm = EditVendorProfileForm;

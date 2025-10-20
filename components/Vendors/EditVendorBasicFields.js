function EditVendorBasicFields({ 
  formData, 
  handleInputChange, 
  handleCategoryChange, 
  loading, 
  isCreate = false,
  profilePicturePreview = null,
  handleProfilePictureChange = null 
}) {
  try {
    const [localProfilePicturePreview, setLocalProfilePicturePreview] = React.useState(null);

    React.useEffect(() => {
      if (profilePicturePreview) {
        setLocalProfilePicturePreview(profilePicturePreview);
      } else if (formData.profile_picture_url) {
        setLocalProfilePicturePreview(formData.profile_picture_url);
      }
    }, [formData.profile_picture_url, profilePicturePreview]);

    const handleLocalProfilePictureChange = (event) => {
      if (handleProfilePictureChange) {
        // Use the passed handler for create form
        handleProfilePictureChange(event);
        return;
      }

      // Default handler for edit form
      const file = event.target.files[0];
      if (!file) return;

      // Check file type
      if (!file.type.startsWith('image/')) {
        window.toast?.error('Please select a valid image file');
        return;
      }

      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        window.toast?.error('Image size must be less than 5MB');
        return;
      }

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        setLocalProfilePicturePreview(imageUrl);
        handleInputChange({ 
          target: { 
            name: 'profile_picture_url', 
            value: imageUrl 
          } 
        });
        window.toast?.success('Profile picture uploaded successfully');
      };
      reader.onerror = () => {
        window.toast?.error('Error reading image file');
      };
      reader.readAsDataURL(file);
    };

    const removeProfilePicture = () => {
      setLocalProfilePicturePreview(null);
      handleInputChange({ target: { name: 'profile_picture_url', value: '' } });
      window.toast?.success('Profile picture removed');
    };

    const onCategoryChange = (category) => {
      if (handleCategoryChange) {
        handleCategoryChange(category);
      } else {
        handleInputChange({ target: { name: 'category', value: category } });
      }
    };

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
        
        {/* Company/Vendor Name - Required field at top */}
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
            Company/Vendor Name *
          </label>
          <input
            type="text"
            id="company"
            name="company"
            value={formData.company || ''}
            onChange={handleInputChange}
            required
            disabled={loading}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Enter your company or vendor name"
          />
          <p className="mt-1 text-sm text-gray-500">This name will appear on event pages, tasks, and vendor listings</p>
        </div>

        {/* Vendor Category */}
        <div>
          <window.VendorCategorySelector
            selectedCategory={formData.category || ''}
            onCategoryChange={onCategoryChange}
            loading={loading}
          />
        </div>

        {/* Business Contact Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Business Contact Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name || ''}
            onChange={handleInputChange}
            disabled={loading}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Enter the primary contact person's name"
          />
        </div>

        {/* Profile Picture */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profile Picture
          </label>
          {localProfilePicturePreview ? (
            <div className="relative inline-block">
              <img 
                src={localProfilePicturePreview} 
                alt="Profile" 
                className="w-32 h-32 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={removeProfilePicture}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                disabled={loading}
              >
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleLocalProfilePictureChange}
                className="hidden"
                id="profile-picture-edit-input"
                disabled={loading}
              />
              <label htmlFor="profile-picture-edit-input" className="cursor-pointer">
                <i className="fas fa-camera text-3xl text-gray-400 mb-2 block"></i>
                <p className="text-sm text-gray-500">Click to upload profile picture</p>
                <p className="text-xs text-gray-400 mt-1">Maximum size: 5MB</p>
              </label>
            </div>
          )}
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
            Business Description
          </label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio || ''}
            onChange={handleInputChange}
            disabled={loading}
            rows="4"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Describe your business and services..."
          />
        </div>
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.EditVendorBasicFields = EditVendorBasicFields;

function EditVendorContactFields({ 
  formData, socialMedia, socialPlatforms, handleInputChange, 
  handleAddSocialMedia, handleSocialMediaChange, handleRemoveSocialMedia 
}) {
  try {
    // Provide default values to prevent undefined errors
    const safeSocialMedia = Array.isArray(socialMedia) ? socialMedia : [];
    const safeSocialPlatforms = Array.isArray(socialPlatforms) ? socialPlatforms : [
      'Instagram', 'Facebook', 'Twitter', 'LinkedIn', 'Website', 'Other'
    ];
    const safeFormData = formData || {};

    return React.createElement('div', { className: 'bg-gray-50 p-6 rounded-lg' },
      React.createElement('h3', { className: 'text-lg font-semibold text-gray-800 mb-4' }, 'Contact Information'),
      React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4' },
        React.createElement('div', null,
          React.createElement('label', { className: 'block text-sm font-semibold text-gray-800 mb-2' }, 'Email Address'),
          React.createElement('input', {
            type: 'email',
            name: 'email',
            value: safeFormData.email || '',
            onChange: handleInputChange,
            className: 'w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-indigo-500',
            placeholder: 'Enter your email'
          })
        ),
        React.createElement('div', null,
          React.createElement('label', { className: 'block text-sm font-semibold text-gray-800 mb-2' }, 'Phone Number'),
          React.createElement('input', {
            type: 'tel',
            name: 'phone',
            value: safeFormData.phone || '',
            onChange: handleInputChange,
            className: 'w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-indigo-500',
            placeholder: 'Enter your phone'
          })
        )
      ),
      // Social Media section
      React.createElement('div', { className: 'mt-4' },
        React.createElement('label', { className: 'block text-sm font-semibold text-gray-800 mb-3' }, 'Social Media'),
        safeSocialMedia.length > 0 ? safeSocialMedia.map((social, index) => (
          React.createElement('div', { key: index, className: 'flex space-x-2 mb-3' },
            React.createElement('select', {
              value: social?.platform || '',
              onChange: (e) => handleSocialMediaChange && handleSocialMediaChange(index, 'platform', e.target.value),
              className: 'px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500'
            },
              safeSocialPlatforms.map(platform => 
                React.createElement('option', { key: platform, value: platform }, platform)
              )
            ),
            React.createElement('input', {
              type: 'text',
              value: social?.handle || '',
              onChange: (e) => handleSocialMediaChange && handleSocialMediaChange(index, 'handle', e.target.value),
              placeholder: '@yourcompany or profile name',
              className: 'flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500'
            }),
            React.createElement('button', {
              type: 'button',
              onClick: () => handleRemoveSocialMedia && handleRemoveSocialMedia(index),
              className: 'px-3 py-2 text-red-600 hover:bg-red-100 rounded-lg'
            },
              React.createElement('i', { className: 'fas fa-times' })
            )
          )
        )) : React.createElement('p', { className: 'text-gray-500 text-sm mb-3' }, 'No social media accounts added yet'),
        
        React.createElement('button', {
          type: 'button',
          onClick: handleAddSocialMedia,
          className: 'px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
        },
          React.createElement('i', { className: 'fas fa-plus mr-2' }),
          'Add Social Media'
        )
      )
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.EditVendorContactFields = EditVendorContactFields;

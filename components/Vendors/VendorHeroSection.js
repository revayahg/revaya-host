function VendorHeroSection({ vendor, user }) {
  try {
    const services = Array.isArray(vendor.services) ? vendor.services : [];
    const serviceAreas = Array.isArray(vendor.service_areas) ? vendor.service_areas : [];

    return React.createElement('div', { className: 'bg-white border-b' },
      React.createElement('div', { className: 'container mx-auto px-4 py-8' },
        React.createElement('div', { className: 'flex flex-col md:flex-row gap-8' },
          // Logo/Profile Picture
          React.createElement('div', { className: 'md:w-1/4' },
            React.createElement('div', { className: 'w-full aspect-square rounded-lg overflow-hidden' },
              vendor.profile_picture_url ? 
                React.createElement('img', {
                  src: vendor.profile_picture_url,
                  alt: `${vendor.name}'s profile`,
                  className: 'w-full h-full object-cover'
                }) :
                React.createElement('div', { className: 'w-full h-full bg-gray-100 flex items-center justify-center' },
                  React.createElement('i', { className: 'fas fa-user-circle text-6xl text-gray-400' })
                )
            )
          ),
          
          // Business Info
          React.createElement('div', { className: 'md:w-3/4' },
            React.createElement('div', { className: 'flex justify-between items-start' },
              React.createElement('div', null,
                React.createElement('h1', { className: 'text-3xl font-bold text-gray-900 mb-4' }, vendor.name || 'Vendor Name')
              ),
              user && user.id === vendor.user_id && React.createElement('a', {
                href: `#/vendor/edit/${vendor.id}`,
                className: 'bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-200'
              }, 'Edit Profile'),
              
              !user || user.id !== vendor.user_id ? React.createElement('button', {
                className: 'bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-200'
              }, 'Request Quote') : null
            ),
            
            vendor.bio && React.createElement('p', { className: 'text-gray-600 mb-4' }, vendor.bio),
            
            React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4 text-sm' },
              serviceAreas.length > 0 && React.createElement('div', { className: 'p-4 bg-gray-50 rounded-lg' },
                React.createElement('div', { className: 'font-semibold text-gray-700' }, 'Service Area'),
                React.createElement('div', { className: 'text-gray-600' }, serviceAreas.slice(0, 2).join(', '))
              ),
              vendor.years_of_experience && React.createElement('div', { className: 'p-4 bg-gray-50 rounded-lg' },
                React.createElement('div', { className: 'font-semibold text-gray-700' }, 'Experience'),
                React.createElement('div', { className: 'text-gray-600' }, `${vendor.years_of_experience}+ Years`)
              ),
              services.length > 0 && React.createElement('div', { className: 'p-4 bg-gray-50 rounded-lg' },
                React.createElement('div', { className: 'font-semibold text-gray-700' }, 'Services'),
                React.createElement('div', { className: 'text-gray-600' }, `${services.length} Services`)
              ),
              React.createElement('div', { className: 'p-4 bg-gray-50 rounded-lg' },
                React.createElement('div', { className: 'font-semibold text-gray-700' }, 'Events/Year'),
                React.createElement('div', { className: 'text-gray-600' }, '100+')
              )
            )
          )
        )
      )
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.VendorHeroSection = VendorHeroSection;

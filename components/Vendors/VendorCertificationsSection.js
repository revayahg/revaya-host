function VendorCertificationsSection({ vendor }) {
  try {
    const insurance = vendor.insurance || {};
    
    // Mock certifications - in real app this could come from vendor data
    const certifications = [
      {
        icon: 'certificate',
        title: 'Licensed Business',
        issuer: 'State Department',
        year: '2023'
      },
      {
        icon: 'award',
        title: 'Quality Certified',
        issuer: 'Industry Standards',
        year: '2023'
      },
      {
        icon: 'shield-alt',
        title: 'Safety Compliant',
        issuer: 'Safety Commission',
        year: '2023'
      }
    ];

    // Add insurance as certification if available
    if (insurance.provider) {
      certifications.push({
        icon: 'shield-alt',
        title: 'Insured Business',
        issuer: insurance.provider,
        year: insurance.expiryDate ? new Date(insurance.expiryDate).getFullYear().toString() : '2023'
      });
    }

    return React.createElement('section', { className: 'bg-white rounded-lg p-6 shadow-sm' },
      React.createElement('h2', { className: 'text-xl font-bold mb-6' }, 'Licenses & Certifications'),
      React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-3 gap-6' },
        certifications.map((cert, index) => (
          React.createElement('div', { key: index, className: 'p-4 border rounded-lg bg-gray-50' },
            React.createElement('div', { className: 'text-3xl text-blue-600 mb-2' },
              React.createElement('i', { className: `fas fa-${cert.icon}` })
            ),
            React.createElement('h3', { className: 'font-semibold mb-1' }, cert.title),
            React.createElement('p', { className: 'text-sm text-gray-600' }, cert.issuer),
            React.createElement('p', { className: 'text-sm text-gray-500' }, `Exp. ${cert.year}`)
          )
        ))
      )
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.VendorCertificationsSection = VendorCertificationsSection;

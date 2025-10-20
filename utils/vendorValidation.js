function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone) {
  const phoneRegex = /^\+?[\d\s-()]{10,}$/;
  return phoneRegex.test(phone);
}

function validateUrl(url) {
  if (!url) return true;
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
    return true;
  } catch {
    return false;
  }
}

function validateVendorProfile(profile) {
  const errors = {};

  // Required fields
  if (!profile.businessName?.trim()) {
    errors.businessName = 'Business name is required';
  }

  if (!profile.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(profile.email)) {
    errors.email = 'Invalid email format';
  }

  if (profile.phone && !validatePhone(profile.phone)) {
    errors.phone = 'Invalid phone number format';
  }

  if (profile.website && !validateUrl(profile.website)) {
    errors.website = 'Invalid website URL';
  }

  // Category validation
  if (!profile.category) {
    errors.category = 'Please select a business category';
  }

  // Social media validation
  if (profile.socialMedia) {
    const socialErrors = {};
    Object.entries(profile.socialMedia).forEach(([platform, url]) => {
      if (url && !validateUrl(url)) {
        socialErrors[platform] = `Invalid ${platform} URL format`;
      }
    });
    if (Object.keys(socialErrors).length > 0) {
      errors.socialMedia = socialErrors;
    }
  }

  // Certifications validation
  if (profile.certifications) {
    if (!Array.isArray(profile.certifications)) {
      errors.certifications = 'Certifications must be an array';
    } else {
      const certErrors = profile.certifications.map((cert, index) => {
        const certError = {};
        if (!cert.name?.trim()) {
          certError.name = 'Certification name is required';
        }
        if (!cert.issuer?.trim()) {
          certError.issuer = 'Issuing organization is required';
        }
        if (cert.year && (isNaN(cert.year) || cert.year < new Date().getFullYear())) {
          certError.year = 'Invalid expiration year';
        }
        return Object.keys(certError).length > 0 ? { index, ...certError } : null;
      }).filter(Boolean);

      if (certErrors.length > 0) {
        errors.certifications = certErrors;
      }
    }
  }

  // Portfolio validation
  if (profile.portfolioImages) {
    if (!Array.isArray(profile.portfolioImages)) {
      errors.portfolioImages = 'Portfolio images must be an array';
    } else if (profile.portfolioImages.length > 20) {
      errors.portfolioImages = 'Maximum 20 portfolio images allowed';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

window.validateVendorProfile = validateVendorProfile;
window.validateEmail = validateEmail;
window.validatePhone = validatePhone;
window.validateUrl = validateUrl;

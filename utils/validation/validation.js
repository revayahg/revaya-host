function validateEmail(email) {
  if (!email) return false;
  // More permissive email regex that accepts domains like revayahost.com
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

function validatePassword(password) {
  if (!password) return { valid: false, message: 'Password is required' };
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  
  let strength = 0;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  
  return {
    valid: true,
    strength: strength,
    message: strength < 3 ? 'Consider using a stronger password' : 'Password is strong'
  };
}

function validateName(name) {
  return typeof name === 'string' && name.trim().length > 0;
}

function validatePhone(phone) {
  if (!phone) return true; // Optional field
  const phoneRegex = /^\+?[\d\s-]{10,}$/;
  return phoneRegex.test(phone);
}

function validateFile(file, type = 'image') {
  if (!file) return true; // Optional

  const maxSizes = {
    image: 5 * 1024 * 1024, // 5MB
    document: 10 * 1024 * 1024 // 10MB
  };

  const allowedTypes = {
    image: ['image/jpeg', 'image/png', 'image/webp'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  };

  if (!allowedTypes[type].includes(file.type)) {
    throw new Error(`Invalid file type. Allowed types: ${allowedTypes[type].join(', ')}`);
  }

  if (file.size > maxSizes[type]) {
    throw new Error(`File too large. Maximum size: ${maxSizes[type] / (1024 * 1024)}MB`);
  }

  return true;
}

function validateUserData(userData) {
  const errors = [];

  if (!validateEmail(userData.email)) {
    errors.push('Please enter a valid email address');
  }

  const passwordCheck = validatePassword(userData.password);
  if (!passwordCheck.valid) {
    errors.push(passwordCheck.message);
  }

  if (!validateName(userData.firstName) || !validateName(userData.lastName)) {
    errors.push('Please enter both first and last name');
  }

  if (userData.phoneNumber && !validatePhone(userData.phoneNumber)) {
    errors.push('Please enter a valid phone number');
  }

  if (userData.profilePicture) {
    try {
      validateFile(userData.profilePicture, 'image');
    } catch (error) {
      errors.push(error.message);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Make validation functions globally available
window.validateEmail = validateEmail;
window.validatePassword = validatePassword;
window.validateName = validateName;
window.validatePhone = validatePhone;
window.validateFile = validateFile;
window.validateUserData = validateUserData;

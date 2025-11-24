// Generic error message utility for production security
// File: utils/core/errorMessages.js

window.ErrorMessages = {
  // Generic error messages that don't leak sensitive information
  GENERIC_ERRORS: {
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'Access denied',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Invalid request data',
    SERVER_ERROR: 'An error occurred. Please try again.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    TIMEOUT_ERROR: 'Request timed out. Please try again.',
    RATE_LIMIT_ERROR: 'Too many requests. Please wait and try again.',
    FILE_UPLOAD_ERROR: 'File upload failed',
    FILE_SIZE_ERROR: 'File size exceeds limit',
    FILE_TYPE_ERROR: 'Unsupported file type',
    PROCESSING_ERROR: 'Processing failed. Please try again.',
    AI_SERVICE_ERROR: 'AI service temporarily unavailable'
  },

  // Environment-specific error handling
  getErrorMessage(error, isDevelopment = false) {
    if (isDevelopment) {
      // In development, show detailed errors for debugging
      return error.message || error.toString()
    }

    // In production, return generic messages
    if (error.message) {
      const message = error.message.toLowerCase()
      
      // Map specific errors to generic messages
      if (message.includes('unauthorized') || message.includes('auth')) {
        return this.GENERIC_ERRORS.UNAUTHORIZED
      }
      if (message.includes('forbidden') || message.includes('permission')) {
        return this.GENERIC_ERRORS.FORBIDDEN
      }
      if (message.includes('not found') || message.includes('404')) {
        return this.GENERIC_ERRORS.NOT_FOUND
      }
      if (message.includes('validation') || message.includes('invalid')) {
        return this.GENERIC_ERRORS.VALIDATION_ERROR
      }
      if (message.includes('timeout')) {
        return this.GENERIC_ERRORS.TIMEOUT_ERROR
      }
      if (message.includes('rate limit') || message.includes('too many')) {
        return this.GENERIC_ERRORS.RATE_LIMIT_ERROR
      }
      if (message.includes('file size')) {
        return this.GENERIC_ERRORS.FILE_SIZE_ERROR
      }
      if (message.includes('file type') || message.includes('unsupported')) {
        return this.GENERIC_ERRORS.FILE_TYPE_ERROR
      }
      if (message.includes('upload')) {
        return this.GENERIC_ERRORS.FILE_UPLOAD_ERROR
      }
      if (message.includes('processing') || message.includes('ai')) {
        return this.GENERIC_ERRORS.PROCESSING_ERROR
      }
    }

    // Default to generic server error
    return this.GENERIC_ERRORS.SERVER_ERROR
  },

  // Check if we're in development mode
  isDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname.includes('localhost') ||
           window.SUPABASE_CONFIG?.environment === 'development'
  },

  // Safe error logging (only in development)
  logError(error, context = '') {
    if (this.isDevelopment()) {
      console.error(`[${context}]`, error)
    }
  }
}

// Make it globally available
window.getSafeErrorMessage = (error) => {
  return window.ErrorMessages.getErrorMessage(error, window.ErrorMessages.isDevelopment())
}

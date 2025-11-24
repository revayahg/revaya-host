/**
 * Input Sanitization Utility
 * Provides secure sanitization for user-generated content
 * File: utils/validation/inputSanitizer.js
 */

window.InputSanitizer = {
  /**
   * Sanitize HTML content by removing potentially dangerous tags and attributes
   * @param {string} html - HTML string to sanitize
   * @returns {string} Sanitized HTML
   */
  sanitizeHTML: function(html) {
    if (!html || typeof html !== 'string') return '';
    
    // Remove script tags and event handlers
    let sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/gi, '');
    
    // Remove dangerous attributes
    sanitized = sanitized.replace(/\s*(href|src|action|formaction)\s*=\s*["']?javascript:/gi, '');
    
    return sanitized.trim();
  },

  /**
   * Escape HTML special characters for safe text display
   * @param {string} text - Text to escape
   * @returns {string} Escaped text safe for HTML display
   */
  escapeHTML: function(text) {
    if (!text || typeof text !== 'string') return '';
    
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
      '/': '&#x2F;'
    };
    
    return text.replace(/[&<>"'/]/g, (char) => map[char]);
  },

  /**
   * Sanitize text for database storage (remove control characters, normalize whitespace)
   * @param {string} text - Text to sanitize
   * @param {number} maxLength - Maximum allowed length (optional)
   * @returns {string} Sanitized text
   */
  sanitizeText: function(text, maxLength = null) {
    if (!text || typeof text !== 'string') return '';
    
    // Remove control characters (except newlines, tabs, carriage returns)
    let sanitized = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    
    // Normalize whitespace (collapse multiple spaces, keep single spaces)
    sanitized = sanitized.replace(/[ \t]+/g, ' ');
    
    // Remove leading/trailing whitespace
    sanitized = sanitized.trim();
    
    // Apply length limit if provided
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  },

  /**
   * Sanitize filename (remove path traversal, special characters)
   * @param {string} filename - Filename to sanitize
   * @returns {string} Sanitized filename
   */
  sanitizeFilename: function(filename) {
    if (!filename || typeof filename !== 'string') return 'file';
    
    // Remove path traversal attempts
    let sanitized = filename
      .replace(/\.\./g, '')
      .replace(/\//g, '_')
      .replace(/\\/g, '_');
    
    // Remove control characters and special characters except alphanumeric, dot, dash, underscore
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Remove leading/trailing dots and spaces
    sanitized = sanitized.replace(/^[._\s]+|[._\s]+$/g, '');
    
    // Ensure it's not empty
    if (!sanitized || sanitized.length === 0) {
      sanitized = 'file';
    }
    
    // Limit length
    if (sanitized.length > 255) {
      const ext = sanitized.split('.').pop();
      const name = sanitized.substring(0, 255 - ext.length - 1);
      sanitized = name + '.' + ext;
    }
    
    return sanitized;
  },

  /**
   * Validate and sanitize email address
   * @param {string} email - Email to validate
   * @returns {object} {valid: boolean, sanitized: string, error?: string}
   */
  sanitizeEmail: function(email) {
    if (!email || typeof email !== 'string') {
      return { valid: false, sanitized: '', error: 'Email is required' };
    }
    
    // Trim and lowercase
    const sanitized = email.trim().toLowerCase();
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) {
      return { valid: false, sanitized: '', error: 'Invalid email format' };
    }
    
    // Check length
    if (sanitized.length > 254) {
      return { valid: false, sanitized: '', error: 'Email too long' };
    }
    
    return { valid: true, sanitized, error: null };
  },

  /**
   * Sanitize URL (ensure it's safe)
   * @param {string} url - URL to sanitize
   * @returns {string} Sanitized URL or empty string if invalid
   */
  sanitizeURL: function(url) {
    if (!url || typeof url !== 'string') return '';
    
    const trimmed = url.trim();
    
    // Only allow http, https, or relative URLs starting with /
    if (!trimmed.match(/^(https?:\/\/|\/|#)/)) {
      return '';
    }
    
    // Remove javascript: and data: URLs
    if (trimmed.match(/^(javascript|data):/i)) {
      return '';
    }
    
    return trimmed;
  },

  /**
   * Sanitize user input for database storage (general purpose)
   * @param {any} input - Input to sanitize
   * @param {object} options - Sanitization options
   * @returns {any} Sanitized input
   */
  sanitizeInput: function(input, options = {}) {
    const {
      type = 'text',
      maxLength = null,
      allowHTML = false,
      trim = true
    } = options;
    
    if (input === null || input === undefined) return null;
    
    if (typeof input !== 'string') {
      // For non-string types, return as-is (numbers, booleans, objects handled by validation)
      return input;
    }
    
    let sanitized = input;
    
    if (trim) {
      sanitized = sanitized.trim();
    }
    
    if (!allowHTML) {
      // Escape HTML if not allowing HTML
      sanitized = this.escapeHTML(sanitized);
    } else {
      // If allowing HTML, sanitize dangerous parts
      sanitized = this.sanitizeHTML(sanitized);
    }
    
    // Apply length limit
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  },

  /**
   * Validate and sanitize UUID
   * @param {string} uuid - UUID to validate
   * @returns {object} {valid: boolean, sanitized: string, error?: string}
   */
  validateUUID: function(uuid) {
    if (!uuid || typeof uuid !== 'string') {
      return { valid: false, sanitized: '', error: 'UUID is required' };
    }
    
    const sanitized = uuid.trim().toLowerCase();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    
    if (!uuidRegex.test(sanitized)) {
      return { valid: false, sanitized: '', error: 'Invalid UUID format' };
    }
    
    return { valid: true, sanitized, error: null };
  },

  /**
   * Sanitize task/event description (preserve formatting but remove dangerous content)
   * @param {string} description - Description text
   * @param {number} maxLength - Maximum length (optional)
   * @returns {string} Sanitized description
   */
  sanitizeDescription: function(description, maxLength = 10000) {
    if (!description || typeof description !== 'string') return '';
    
    // Remove control characters but preserve newlines
    let sanitized = description.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    
    // Remove script tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove javascript: and data: URLs
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/data:text\/html/gi, '');
    
    // Remove event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    
    // Trim and limit length
    sanitized = sanitized.trim();
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }
};

// Make helper functions globally available
window.sanitizeHTML = window.InputSanitizer.sanitizeHTML.bind(window.InputSanitizer);
window.escapeHTML = window.InputSanitizer.escapeHTML.bind(window.InputSanitizer);
window.sanitizeText = window.InputSanitizer.sanitizeText.bind(window.InputSanitizer);
window.sanitizeFilename = window.InputSanitizer.sanitizeFilename.bind(window.InputSanitizer);


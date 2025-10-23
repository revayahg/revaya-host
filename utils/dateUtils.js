// Date utilities for consistent date handling across the application
// Handles conversion between database timestamps and UI date strings

const DateUtils = {
    /**
     * Convert a database timestamp to a YYYY-MM-DD string for HTML date inputs
     * @param {string|Date|null} dbDate - Database timestamp or date string
     * @returns {string} - YYYY-MM-DD format or empty string
     */
    dbToInputDate(dbDate) {
        if (!dbDate) return '';
        
        try {
            let date;
            
            // Handle different input formats
            if (typeof dbDate === 'string') {
                // If it's already in YYYY-MM-DD format, return as-is
                if (/^\d{4}-\d{2}-\d{2}$/.test(dbDate)) {
                    return dbDate;
                }
                
                // If it's a full timestamp, parse it
                date = new Date(dbDate);
            } else if (dbDate instanceof Date) {
                date = dbDate;
            } else {
                return '';
            }
            
            // Check if the date is valid
            if (isNaN(date.getTime())) {
                console.warn('Invalid date provided to dbToInputDate:', dbDate);
                return '';
            }
            
            // Convert to YYYY-MM-DD format
            return date.toISOString().split('T')[0];
        } catch (error) {
            console.warn('Error converting database date to input format:', error, 'Input:', dbDate);
            return '';
        }
    },

    /**
     * Convert a YYYY-MM-DD string to a database-compatible timestamp
     * @param {string} inputDate - YYYY-MM-DD format string
     * @returns {string|null} - ISO timestamp string or null
     */
    inputToDbDate(inputDate) {
        if (!inputDate || typeof inputDate !== 'string') {
            return null;
        }
        
        try {
            // Validate YYYY-MM-DD format
            if (!/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
                console.warn('Invalid date format for inputToDbDate:', inputDate);
                return null;
            }
            
            // Create date and validate it's not invalid
            const date = new Date(inputDate + 'T00:00:00');
            if (isNaN(date.getTime())) {
                console.warn('Invalid date created from input:', inputDate);
                return null;
            }
            
            return date.toISOString();
        } catch (error) {
            console.warn('Error converting input date to database format:', error, 'Input:', inputDate);
            return null;
        }
    },

    /**
     * Format a date for display purposes
     * @param {string|Date|null} date - Database timestamp or date string
     * @returns {string} - Formatted date string for display
     */
    formatForDisplay(date) {
        if (!date) return '';
        
        try {
            let dateObj;
            
            if (typeof date === 'string') {
                // Handle YYYY-MM-DD format
                if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    dateObj = new Date(date + 'T00:00:00');
                } else {
                    dateObj = new Date(date);
                }
            } else if (date instanceof Date) {
                dateObj = date;
            } else {
                return '';
            }
            
            if (isNaN(dateObj.getTime())) {
                console.warn('Invalid date provided to formatForDisplay:', date);
                return '';
            }
            
            return dateObj.toLocaleDateString();
        } catch (error) {
            console.warn('Error formatting date for display:', error, 'Input:', date);
            return '';
        }
    },

    /**
     * Validate if a date string is in the correct format
     * @param {string} dateStr - Date string to validate
     * @returns {boolean} - True if valid YYYY-MM-DD format
     */
    isValidDateString(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') {
            return false;
        }
        
        // Check format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return false;
        }
        
        // Check if it creates a valid date
        try {
            const date = new Date(dateStr + 'T00:00:00');
            return !isNaN(date.getTime());
        } catch {
            return false;
        }
    },

    /**
     * Get a safe date value for sorting (handles invalid dates)
     * @param {string|Date|null} date - Date to convert
     * @param {Date} fallbackDate - Date to use if input is invalid (defaults to far future)
     * @returns {Date} - Safe date object for sorting
     */
    getSafeDateForSorting(date, fallbackDate = new Date('9999-12-31')) {
        if (!date) return fallbackDate;
        
        try {
            let dateObj;
            
            if (typeof date === 'string') {
                if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    dateObj = new Date(date + 'T00:00:00');
                } else {
                    dateObj = new Date(date);
                }
            } else if (date instanceof Date) {
                dateObj = date;
            } else {
                return fallbackDate;
            }
            
            return isNaN(dateObj.getTime()) ? fallbackDate : dateObj;
        } catch (error) {
            console.warn('Error getting safe date for sorting:', error, 'Input:', date);
            return fallbackDate;
        }
    }
};

// Make it available globally
window.DateUtils = DateUtils;

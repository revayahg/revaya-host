/**
 * Staff API Utility
 * File: utils/staffAPI.js
 * Handles CRUD operations for event staff management
 */

window.staffAPI = {
    /**
     * Get all staff members for an event
     * @param {string} eventId - Event ID
     * @returns {Promise<Array>} Array of staff members
     */
    async getStaff(eventId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('event_staff')
                .select('*')
                .eq('event_id', eventId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching staff:', error);
                // Provide more detailed error message
                if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('404')) {
                    throw new Error('The event_staff table does not exist. Please run the database migration: database/migrations/20251028000007_create_event_staff_table.sql');
                }
                throw error;
            }
            return data || [];
        } catch (error) {
            console.error('Error fetching staff:', error);
            throw error;
        }
    },

    /**
     * Create a new staff member
     * @param {Object} staffData - Staff member data
     * @param {string} staffData.event_id - Event ID
     * @param {string} staffData.name - Staff member name
     * @param {string} staffData.role - Staff role/task
     * @param {string} [staffData.shift] - Shift time
     * @param {string} [staffData.contact] - Contact info
     * @param {boolean} [staffData.confirmed] - Confirmation status
     * @param {string} [staffData.notes] - Additional notes
     * @returns {Promise<Object>} Created staff member
     */
    async createStaff(staffData) {
        try {
            const { data, error } = await window.supabaseClient
                .from('event_staff')
                .insert([staffData])
                .select()
                .single();

            if (error) {
                console.error('Error creating staff member:', error);
                // Provide more detailed error message
                if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('404')) {
                    throw new Error('The event_staff table does not exist. Please run the database migration: database/migrations/20251028000007_create_event_staff_table.sql');
                }
                if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('row-level security')) {
                    throw new Error('Permission denied: You do not have permission to add staff members to this event. Only event owners and editors can add staff.');
                }
                throw error;
            }
            return data;
        } catch (error) {
            console.error('Error creating staff member:', error);
            throw error;
        }
    },

    /**
     * Update a staff member
     * @param {string} staffId - Staff member ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated staff member
     */
    async updateStaff(staffId, updates) {
        try {
            const { data, error } = await window.supabaseClient
                .from('event_staff')
                .update(updates)
                .eq('id', staffId)
                .select()
                .single();

            if (error) {
                console.error('Error updating staff member:', error);
                if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('404')) {
                    throw new Error('The event_staff table does not exist. Please run the database migration.');
                }
                if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('row-level security')) {
                    throw new Error('Permission denied: You do not have permission to update staff members.');
                }
                throw error;
            }
            return data;
        } catch (error) {
            console.error('Error updating staff member:', error);
            throw error;
        }
    },

    /**
     * Delete a staff member
     * @param {string} staffId - Staff member ID
     * @returns {Promise<void>}
     */
    async deleteStaff(staffId) {
        try {
            const { error } = await window.supabaseClient
                .from('event_staff')
                .delete()
                .eq('id', staffId);

            if (error) {
                console.error('Error deleting staff member:', error);
                if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('404')) {
                    throw new Error('The event_staff table does not exist. Please run the database migration.');
                }
                if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('row-level security')) {
                    throw new Error('Permission denied: You do not have permission to delete staff members.');
                }
                throw error;
            }
        } catch (error) {
            console.error('Error deleting staff member:', error);
            throw error;
        }
    },

    /**
     * Create multiple staff members at once
     * @param {Array<Object>} staffArray - Array of staff member data
     * @returns {Promise<Array>} Array of created staff members
     */
    async createMultipleStaff(staffArray) {
        try {
            const { data, error } = await window.supabaseClient
                .from('event_staff')
                .insert(staffArray)
                .select();

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error creating multiple staff members:', error);
            throw error;
        }
    },

    /**
     * Get staff statistics for an event
     * @param {string} eventId - Event ID
     * @returns {Promise<Object>} Staff statistics
     */
    async getStaffStats(eventId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('event_staff')
                .select('confirmed, role, shift')
                .eq('event_id', eventId);

            if (error) {
                console.error('Error fetching staff stats:', error);
                if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('404')) {
                    // Return empty stats if table doesn't exist
                    return { total: 0, confirmed: 0, pending: 0, byRole: {}, byShift: {} };
                }
                throw error;
            }

            const stats = {
                total: data.length,
                confirmed: data.filter(s => s.confirmed).length,
                pending: data.filter(s => !s.confirmed).length,
                byRole: {},
                byShift: {}
            };

            // Count by role
            data.forEach(staff => {
                const role = staff.role || 'Unassigned';
                stats.byRole[role] = (stats.byRole[role] || 0) + 1;
            });

            // Count by shift
            data.forEach(staff => {
                const shift = staff.shift || 'Unassigned';
                stats.byShift[shift] = (stats.byShift[shift] || 0) + 1;
            });

            return stats;
        } catch (error) {
            console.error('Error fetching staff stats:', error);
            throw error;
        }
    },

    /**
     * Export staff data as CSV format for clipboard
     * @param {Array} staffData - Array of staff members
     * @returns {string} CSV formatted string
     */
    exportToCSV(staffData) {
        if (!staffData || staffData.length === 0) return '';

        const headers = ['Name', 'Role', 'Shift', 'Contact', 'Confirmed', 'Notes'];
        const csvRows = [headers.join('\t')];

        staffData.forEach(staff => {
            const row = [
                staff.name || '',
                staff.role || '',
                staff.shift || '',
                staff.contact || '',
                staff.confirmed ? 'Yes' : 'No',
                staff.notes || ''
            ];
            csvRows.push(row.join('\t'));
        });

        return csvRows.join('\n');
    },

    /**
     * Copy staff data to clipboard
     * @param {Array} staffData - Array of staff members
     * @returns {Promise<boolean>} Success status
     */
    async copyToClipboard(staffData) {
        try {
            const csvData = this.exportToCSV(staffData);
            await navigator.clipboard.writeText(csvData);
            return true;
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            return false;
        }
    },

    /**
     * Get common role templates
     * @returns {Array<string>} Array of common roles
     */
    getRoleTemplates() {
        return [
            'VIP Door',
            'Check-in',
            'Runner',
            'Vendor Move-in/out',
            'Store Support',
            'Security',
            'Catering',
            'Setup',
            'Breakdown',
            'Photography',
            'Audio/Visual',
            'Parking',
            'Registration',
            'Guest Services',
            'Manager',
            'Supervisor'
        ];
    },

    /**
     * Get common shift templates
     * @returns {Array<string>} Array of common shifts
     */
    getShiftTemplates() {
        return [
            '6:00 AM - 10:00 AM',
            '10:00 AM - 2:00 PM',
            '2:00 PM - 6:00 PM',
            '6:00 PM - 10:00 PM',
            '10:00 PM - 2:00 AM',
            'All Day (8:00 AM - 8:00 PM)',
            'Morning (6:00 AM - 12:00 PM)',
            'Afternoon (12:00 PM - 6:00 PM)',
            'Evening (6:00 PM - 12:00 AM)',
            'Overnight (10:00 PM - 6:00 AM)'
        ];
    }
};

console.log('📋 staffAPI.js loaded');

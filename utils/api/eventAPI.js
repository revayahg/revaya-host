// Event API utilities for scalable event management
// Handles normalized event data operations

const EventAPI = {
    // Create event with vendor categories and dates
    async createEvent(eventData, vendorCategories = [], eventDates = []) {
        try {
            // Ensure both user_id and created_by are set for compatibility
            const userId = eventData.user_id || eventData.created_by;
            if (!userId) {
                throw new Error('User ID is required for event creation');
            }

            // Map form fields to database schema for consistency
            const mappedEventData = {
                ...eventData,
                user_id: userId,           // Primary user field
                created_by: userId,        // Backup user field for compatibility
                name: eventData.name || eventData.title, // Ensure name field is set
                title: eventData.title || eventData.name, // Keep both for compatibility
                start_date: eventData.start_date || eventData.date,
                date: eventData.date || eventData.start_date
            };

            // Create the basic event
            const { data: event, error: eventError } = await window.supabaseClient
                .from('events')
                .insert([mappedEventData])
                .select()
                .single();

            if (eventError) throw eventError;

            // Add vendor categories if provided
            if (vendorCategories.length > 0) {
                await this.updateVendorCategories(event.id, vendorCategories);
            }

            // Add event dates if provided
            if (eventDates.length > 0) {
                await this.updateEventDates(event.id, eventDates, userId);
            }

            return event;
        } catch (error) {
            throw error;
        }
    },

    // Get event with all related data
    async getEvent(eventId, userId) {
        try {
            // Get basic event data - no user_id filter to allow collaborators
            const { data: event, error: eventError } = await window.supabaseClient
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (eventError) throw eventError;

            // Get vendor categories
            const { data: vendorCategories } = await window.supabaseClient
                .rpc('get_event_vendor_categories', { event_uuid: eventId });

            event.vendor_categories = vendorCategories || [];

            // Get event dates
            const { data: eventDates } = await window.supabaseClient
                .rpc('get_event_dates', { event_uuid: eventId });

            event.event_dates = eventDates || [];

            return event;
        } catch (error) {
            throw error;
        }
    },

    // Check if user can view event
    canUserViewEvent: async function(eventId, userId) {
        try {
            if (!eventId || !userId) return false;

            // Check if user is the event owner
            const { data: event, error } = await window.supabaseClient
                .from('events')
                .select('user_id, created_by')
                .eq('id', eventId)
                .single();

            if (error) {
                return false;
            }

            // Check both user_id and created_by for ownership
            if (event.user_id === userId || event.created_by === userId) return true;

            // Check if user has any role (including viewer)
            const { data: userRole, error: roleError } = await window.supabaseClient
                .from('event_user_roles')
                .select('role, status')
                .eq('event_id', eventId)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (roleError && roleError.code !== 'PGRST116') {
                return false;
            }

            return userRole?.role === 'viewer' || userRole?.role === 'editor' || userRole?.role === 'admin';
        } catch (error) {
            return false;
        }
    },

    // Check if user can edit event
    canUserEditEvent: async function(eventId, userId) {
        try {
            if (!eventId || !userId) return false;

            // Check if user is the event owner
            const { data: event, error } = await window.supabaseClient
                .from('events')
                .select('user_id, created_by')
                .eq('id', eventId)
                .single();

            if (error) {
                return false;
            }

            // Check both user_id and created_by for ownership
            if (event.user_id === userId || event.created_by === userId) return true;

            // Check if user has edit role
            const { data: userRole, error: roleError } = await window.supabaseClient
                .from('event_user_roles')
                .select('role, status')
                .eq('event_id', eventId)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (roleError && roleError.code !== 'PGRST116') {
                return false;
            }

            return userRole?.role === 'editor' || userRole?.role === 'admin';
        } catch (error) {
            return false;
        }
    },

    // Update vendor categories for an event
    async updateVendorCategories(eventId, vendorCategories) {
        try {
            // First, delete existing categories for this event
            const { error: deleteError } = await window.supabaseClient
                .from('event_vendor_categories')
                .delete()
                .eq('event_id', eventId);

            if (deleteError) {
                throw deleteError;
            }

            // Insert new categories if any
            if (vendorCategories && vendorCategories.length > 0) {
                const categoriesData = vendorCategories.map(category => ({
                    event_id: eventId,
                    category_name: category,
                    category_icon: '🔧' // Default icon
                }));

                const { error: insertError } = await window.supabaseClient
                    .from('event_vendor_categories')
                    .insert(categoriesData);

                if (insertError) {
                    throw insertError;
                }
            }
        } catch (error) {
            throw error;
        }
    },

    // Update event dates for an event
    async updateEventDates(eventId, eventDates, userId) {
        try {
            // Ensure eventDates is an array and not null/undefined
            if (!Array.isArray(eventDates)) {
                return;
            }

            // First, delete existing event dates for this event
            const { error: deleteError } = await window.supabaseClient
                .from('event_dates')
                .delete()
                .eq('event_id', eventId);

            if (deleteError) {
                throw new Error(`Failed to clear existing event schedule: ${deleteError.message || 'Unknown error'}`);
            }

            // Filter out empty dates and insert new ones (times are optional)
            const validEventDates = eventDates
                .filter(dateItem => {
                    // Ensure dateItem is an object with at least a date
                    return dateItem && 
                           typeof dateItem === 'object' && 
                           dateItem.date && 
                           typeof dateItem.date === 'string' &&
                           dateItem.date.trim() !== '';
                })
                .map(dateItem => ({
                    event_id: eventId,
                    event_date: dateItem.date,
                    start_time: dateItem.startTime || null, // Allow null start time
                    end_time: dateItem.endTime || null, // Allow null end time
                    user_id: userId
                }));

            if (validEventDates.length > 0) {
                const { error: insertError } = await window.supabaseClient
                    .from('event_dates')
                    .insert(validEventDates);

                if (insertError) {
                    throw new Error(`Failed to save event schedule: ${insertError.message || 'Unknown error'}`);
                }
            }
        } catch (error) {
            throw error;
        }
    },

    // Get user's role for an event
    getUserEventRole: async function(eventId, userId) {
        try {
            if (!eventId || !userId) return null;

            // Check if user is the event owner first
            const { data: event, error } = await window.supabaseClient
                .from('events')
                .select('user_id, created_by')
                .eq('id', eventId)
                .single();

            if (error) {
                return null;
            }

            // If user is owner, return admin role
            if (event.user_id === userId || event.created_by === userId) {
                return 'admin';
            }

            // Check if user has a collaborator role
            const { data: userRole, error: roleError } = await window.supabaseClient
                .from('event_user_roles')
                .select('role')
                .eq('event_id', eventId)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (roleError && roleError.code !== 'PGRST116') {
                return null;
            }

            return userRole?.role || null;
        } catch (error) {
            return null;
        }
    },

    // Update event with notifications
    updateEvent: async function(eventId, updates, userId) {
        try {
            // EventAPI.updateEvent called
            
            // Get the original event first to compare changes
            const { data: originalEvent, error: fetchError } = await window.supabaseClient
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (fetchError) throw fetchError;

            // Handle event schedule updates separately
            if (updates.eventSchedule && Array.isArray(updates.eventSchedule)) {
                await this.updateEventDates(eventId, updates.eventSchedule, userId);
                delete updates.eventSchedule; // Remove from main update
            }

            // Clean up any undefined or null values that might cause .match() errors
            // CRITICAL: Filter out columns that don't exist in the events table
            // List of valid event columns - anything else will be filtered out
            const VALID_EVENT_COLUMNS = [
                'id', 'name', 'title', 'description', 'about', 'location', 'event_type',
                'date', 'start_date', 'end_date', 'event_time', 'attendance', 'expected_attendance',
                'attendance_range', 'vendor_categories', 'formatted_vendor_categories', 'vendor_category_groups',
                'event_map', 'logo', 'budget', 'status', 'is_public', 'created_at', 'updated_at',
                'user_id', 'created_by', 'owner_email', 'event_schedule', 'support_staff_needed',
                'documents_processed_count'
            ];
            
            const cleanUpdates = {};
            Object.keys(updates).forEach(key => {
                // CRITICAL: Skip event_name completely - the column is called "name" not "event_name"
                if (key === 'event_name') {
                    // Map event_name to name if name is not already provided
                    if (!updates.name && updates.event_name) {
                        cleanUpdates.name = updates.event_name;
                    }
                    return; // Skip adding event_name
                }
                
                // Skip any other invalid columns
                if (!VALID_EVENT_COLUMNS.includes(key)) {
                    console.warn(`⚠️ Skipping invalid event column: ${key}`);
                    return;
                }
                
                const value = updates[key];
                if (value !== null && value !== undefined) {
                    // Ensure string values don't cause .match() errors
                    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                        cleanUpdates[key] = value;
                    } else if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
                        cleanUpdates[key] = value;
                    }
                }
            });
            
            // Double-check: explicitly remove event_name if it somehow got through
            delete cleanUpdates.event_name;

            // Update the event
            const { data, error } = await window.supabaseClient
                .from('events')
                .update(cleanUpdates)
                .eq('id', eventId)
                .select()
                .single();

            if (error) throw error;

            // Create notifications for significant changes
            await this.createEventUpdateNotifications(originalEvent, data, cleanUpdates);

            return data;
        } catch (error) {
            throw error;
        }
    },

    // Create notifications for event updates
    createEventUpdateNotifications: async function(originalEvent, updatedEvent, updates) {
        try {
            // Checking for notification triggers
            
            // Skip budget-related updates as per plan
            if (updates.budget || updates.total_budget || updates.budget_items) {
                // Skipping notifications - budget update
                return;
            }

            // Determine what changed and create appropriate notifications
            const changes = [];
            if (updates.start_date && originalEvent.start_date !== updatedEvent.start_date) {
                changes.push(`Date changed to ${new Date(updatedEvent.start_date).toLocaleDateString()}`);
            }
            if (updates.end_date && originalEvent.end_date !== updatedEvent.end_date) {
                changes.push(`End date changed to ${new Date(updatedEvent.end_date).toLocaleDateString()}`);
            }
            if (updates.location && originalEvent.location !== updatedEvent.location) {
                changes.push(`Location changed to ${updatedEvent.location}`);
            }
            if (updates.name && originalEvent.name !== updatedEvent.name) {
                changes.push(`Event renamed to ${updatedEvent.name}`);
            }
            if (updates.status && originalEvent.status !== updatedEvent.status) {
                changes.push(`Status changed to ${updatedEvent.status}`);
            }
            
            // Check for event_schedule changes (which includes times)
            if (updates.event_schedule && JSON.stringify(originalEvent.event_schedule) !== JSON.stringify(updatedEvent.event_schedule)) {
                changes.push(`Event schedule updated`);
            }

            if (changes.length === 0) {
                // No significant changes, skipping notifications
                return;
            }

            // Get all event collaborators (not just vendors)
            // Use a two-step query to avoid the relationship issue
            let collaborators = [];
            let collaboratorsError = null;
            
            try {
                // First get the user IDs from event_user_roles
                const { data: roleData, error: roleError } = await window.supabaseClient
                    .from('event_user_roles')
                    .select('user_id')
                    .eq('event_id', updatedEvent.id)
                    .eq('status', 'active');

                // Retrieved role data

                if (roleData && roleData.length > 0) {
                    // Then get profile data for each user ID
                    const userIds = roleData.map(role => role.user_id);
                    const { data: profileData, error: profileError } = await window.supabaseClient
                        .from('profiles')
                        .select('id, email, first_name, last_name')
                        .in('id', userIds);

                    // Retrieved profile data

                    // Combine the data
                    collaborators = profileData?.map(profile => ({
                        user_id: profile.id,
                        profiles: {
                            email: profile.email,
                            first_name: profile.first_name,
                            last_name: profile.last_name
                        }
                    })) || [];
                }
            } catch (error) {
                collaboratorsError = error;
            }

            // Collaborators query completed

            if (collaboratorsError || !collaborators?.length) {
                // No collaborators found, sending notification to event owner instead
                
                // Send notification to event owner as fallback
                const session = await window.supabaseClient.auth.getSession();
                
                const { data: eventOwner, error: ownerError } = await window.supabaseClient
                    .from('profiles')
                    .select('email, first_name, last_name')
                    .eq('id', updatedEvent.user_id || updatedEvent.created_by)
                    .single();

                // Event owner lookup completed

                if (eventOwner?.email && window.unifiedNotificationService) {
                    const updaterName = session?.data?.session?.user?.email || 'Event Manager';
                    // Sending email to event owner
                    await window.unifiedNotificationService.sendEventUpdateEmail(
                        eventOwner.email,
                        updatedEvent.name || updatedEvent.title || 'Event',
                        updatedEvent.id,
                        changes.join(', '),
                        updaterName,
                        changes.join(', ')
                    );
                    // Event update email sent to event owner
                } else {
                    // Could not send email - missing event owner email or unifiedNotificationService
                }
                return;
            }

            // Get current user (event updater) info
            const session = await window.supabaseClient.auth.getSession();
            const { data: updaterProfile } = await window.supabaseClient
                .from('profiles')
                .select('first_name, last_name, email')
                .eq('id', session?.data?.session?.user?.id)
                .single();

            const updaterName = updaterProfile ? 
                (updaterProfile.first_name && updaterProfile.last_name ? 
                    `${updaterProfile.first_name} ${updaterProfile.last_name}` : 
                    updaterProfile.email) : 
                'Event Manager';

            // Create notifications and send emails for each collaborator
            const notificationPromises = collaborators.map(async (collaborator) => {
                if (!collaborator.user_id || collaborator.user_id === session?.data?.session?.user?.id) {
                    // Skipping notification for current user
                    return;
                }

                try {
                    // Create in-app notification
                    if (window.notificationAPI) {
                        await window.notificationAPI.createNotification({
                            userId: collaborator.user_id,
                            type: 'event_update',
                            title: `Event Update: ${updatedEvent.name}`,
                            message: `Important changes have been made: ${changes.join(', ')}`,
                            eventId: updatedEvent.id
                        });
                    }

                    // Send email notification
                    if (window.unifiedNotificationService && collaborator.profiles?.email) {
                        await window.unifiedNotificationService.sendEventUpdateEmail(
                            collaborator.profiles.email,
                            updatedEvent.name || updatedEvent.title || 'Event',
                            updatedEvent.id,
                            changes.join(', '),
                            updaterName,
                            changes.join(', ')
                        );
                        // Event update email sent to collaborator
                    }
                } catch (notificationError) {
                    console.error('❌ Event update notification failed (non-blocking):', notificationError);
                }
            });

            await Promise.all(notificationPromises);
        } catch (error) {
            console.error('❌ Event update notifications failed:', error);
        }
    }
};

window.EventAPI = EventAPI;

// Init Messaging V2 once Supabase is available
setTimeout(() => {
  try { window.messageAPIv2?.init({ supabase: window.supabaseClient }); } catch {}
}, 0);
window.canUserEditEvent = EventAPI.canUserEditEvent;
window.canUserViewEvent = EventAPI.canUserViewEvent;
window.getUserEventRole = EventAPI.getUserEventRole;

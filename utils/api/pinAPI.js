// Pin API for managing event map pins with vendor assignments
window.PinAPI = {
    async createPin(pinData) {
        try {
            
            const insertData = {
                event_id: pinData.event_id,
                x: pinData.x,
                y: pinData.y,
                assignee_vendor_id: pinData.assignee_vendor_id || null,
                notes: pinData.notes || '',
                visible_to_vendor: pinData.visible_to_vendor !== false
            };


            const { data, error } = await window.supabaseClient
                .from('pins')
                .insert([insertData])
                .select('*')
                .single();

            if (error) {
                throw new Error(`Failed to create pin: ${error.message}`);
            }
            
            return data;
        } catch (error) {
            throw error;
        }
    },

    async updatePin(pinId, updates) {
        try {
            // If assigning a vendor, first remove them from any other pins in the same event
            if (updates.assignee_vendor_id) {
                const { data: pinData } = await window.supabaseClient
                    .from('pins')
                    .select('event_id')
                    .eq('id', pinId)
                    .single();

                if (pinData) {
                    await window.supabaseClient
                        .from('pins')
                        .update({
                            assignee_vendor_id: null,
                            notes: null,
                            visible_to_vendor: true
                        })
                        .eq('event_id', pinData.event_id)
                        .eq('assignee_vendor_id', updates.assignee_vendor_id)
                        .neq('id', pinId);
                }
            }

            const { data, error } = await window.supabaseClient
                .from('pins')
                .update({
                    x: updates.x,
                    y: updates.y,
                    assignee_vendor_id: updates.assignee_vendor_id,
                    notes: updates.notes,
                    visible_to_vendor: updates.visible_to_vendor
                })
                .eq('id', pinId)
                .select(`
                    *,
                    vendor_profiles!assignee_vendor_id(
                        id,
                        name,
                        company,
                        email
                    )
                `)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            throw error;
        }
    },

    async deletePin(pinId) {
        try {
            const { error } = await window.supabaseClient
                .from('pins')
                .delete()
                .eq('id', pinId);

            if (error) throw error;
            return true;
        } catch (error) {
            throw error;
        }
    },

    async getEventPins(eventId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('pins')
                .select(`
                    *,
                    vendor_profiles!assignee_vendor_id(
                        id,
                        name,
                        company,
                        email
                    )
                `)
                .eq('event_id', eventId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            throw error;
        }
    },

    async getVendorPins(eventId, vendorId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('pins')
                .select(`
                    *,
                    vendor_profiles!assignee_vendor_id(
                        id,
                        name,
                        company,
                        email
                    )
                `)
                .eq('event_id', eventId)
                .eq('assignee_vendor_id', vendorId)
                .eq('visible_to_vendor', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            throw error;
        }
    },

    async getEventVendors(eventId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('event_vendors')
                .select(`
                    vendor_profile_id,
                    vendor_profiles!inner(
                        id,
                        name,
                        company,
                        email
                    )
                `)
                .eq('event_id', eventId);

            if (error) throw error;
            return data?.map(ev => ev.vendor_profiles) || [];
        } catch (error) {
            throw error;
        }
    },

    async removeVendorFromAllPins(eventId, vendorId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('pins')
                .update({
                    assignee_vendor_id: null,
                    notes: null,
                    visible_to_vendor: true
                })
                .eq('event_id', eventId)
                .eq('assignee_vendor_id', vendorId)
                .select();

            if (error) throw error;
            return data;
        } catch (error) {
            throw error;
        }
    },

    async cleanupDuplicatePins(eventId) {
        try {
            // Get all pins for the event with vendor assignments
            const { data: pins, error } = await window.supabaseClient
                .from('pins')
                .select('id, assignee_vendor_id, created_at')
                .eq('event_id', eventId)
                .not('assignee_vendor_id', 'is', null)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Group pins by vendor and keep only the most recent one
            const vendorPins = {};
            const pinsToRemove = [];

            pins.forEach(pin => {
                if (!vendorPins[pin.assignee_vendor_id]) {
                    vendorPins[pin.assignee_vendor_id] = pin;
                } else {
                    pinsToRemove.push(pin.id);
                }
            });

            // Remove duplicate pin assignments
            if (pinsToRemove.length > 0) {
                const { error: removeError } = await window.supabaseClient
                    .from('pins')
                    .update({
                        assignee_vendor_id: null,
                        notes: null,
                        visible_to_vendor: true
                    })
                    .in('id', pinsToRemove);

                if (removeError) throw removeError;
            }

            return { removed: pinsToRemove.length };
        } catch (error) {
            throw error;
        }
    }
};

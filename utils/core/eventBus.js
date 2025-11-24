// Central Event Bus for Real-time UI Updates
window.EventBus = {
    // Event constants
    INVITATIONS_UPDATED: 'invitations_updated',
    COLLABORATOR_UPDATED: 'collaborator_updated',
    EVENTS_UPDATED: 'events_updated',
    DASHBOARD_REFRESH: 'dashboard_refresh',
    INVITATION_ACCEPTED: 'invitation_accepted',

    // Event listeners storage
    listeners: {},

    // Subscribe to an event
    on(eventName, callback) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);
    },

    // Unsubscribe from an event
    off(eventName, callback) {
        if (!this.listeners[eventName]) return;
        this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
    },

    // Emit an event
    emit(eventName, data = {}) {
        if (!this.listeners[eventName]) return;
        this.listeners[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
            }
        });
    },

    // Clear all listeners (useful for cleanup)
    clear() {
        this.listeners = {};
    }
};


// utils/supabaseClient.js
// ———— UMD-based Supabase client ————

// Simple LockManager polyfill to prevent lock errors
if (typeof navigator !== 'undefined' && !navigator.locks) {
  navigator.locks = {
    request: (name, options, callback) => {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      return Promise.resolve(callback ? callback() : undefined);
    },
    query: () => Promise.resolve({ held: [], pending: [] })
  };
}

// Global error handler for any remaining lock-related errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', function(event) {
    if (event.error && event.error.message && 
        (event.error.message.includes('LockManager') || 
         event.error.message.includes('lock:sb-') ||
         event.error.message.includes('immediately failed'))) {
      event.preventDefault();
      return false;
    }
  }, true);
}

// Debug: Log the actual values being used

// Create Supabase client with enhanced lock prevention
window.supabaseClient = supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY,
  { 
    auth: { 
      multiTab: false,
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'sb-auth-token',
      storage: {
        getItem: (key) => {
          try {
            return localStorage.getItem(key);
          } catch (e) {
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            localStorage.setItem(key, value);
          } catch (e) {
          }
        },
        removeItem: (key) => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
          }
        }
      }
    }
  }
);


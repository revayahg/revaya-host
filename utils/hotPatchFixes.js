/* === Revaya Enhanced Hot-Patch: Comprehensive Logout + Role Management === */
;(async function () {
  const supa = window.supabaseClient;
  if (!supa) { 
    return; 
  }

  /* ----------------------- (A) ENHANCED LOGOUT ERROR HARDENING ---------------------- */

  // Global logout state tracking
  window.__LOGOUT_IN_PROGRESS__ = false;
  window.__SIGNED_OUT__ = false;

  // Proactively patch signOut to set flags BEFORE async operations begin
  if (supa.auth.signOut && typeof supa.auth.signOut === 'function') {
    const originalSignOut = supa.auth.signOut.bind(supa.auth);
    supa.auth.signOut = async function patchedSignOut(...args) {
      window.__LOGOUT_IN_PROGRESS__ = true;
      window.__SIGNED_OUT__ = true;
      
      try {
        const result = await originalSignOut(...args);
        return result;
      } catch (error) {
        throw error;
      } finally {
        // Keep signed out flag but clear in-progress flag
        window.__LOGOUT_IN_PROGRESS__ = false;
      }
    };
  }

  // Enhanced auth state change monitoring
  try {
    supa.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        window.__SIGNED_OUT__ = true;
        window.__LOGOUT_IN_PROGRESS__ = false;
      } else if (event === 'SIGNED_IN' && session) {
        window.__SIGNED_OUT__ = false;
        window.__LOGOUT_IN_PROGRESS__ = false;
      }
    });
  } catch (error) {
  }

  // Utility: Enhanced session check with logout protection
  async function hasValidSession() {
    try {
      if (window.__LOGOUT_IN_PROGRESS__ || window.__SIGNED_OUT__) return false;
      const { data: { session } = {}, error } = await supa.auth.getSession();
      if (error) {
        return false;
      }
      return !!session && !window.__SIGNED_OUT__;
    } catch (err) {
      return false;
    }
  }

  // Enhanced error sanitization to prevent "[object Object]" in console
  function sanitizeError(error) {
    if (!error) return 'Unknown error';
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    try {
      return JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
    } catch {
      return String(error);
    }
  }

  // Comprehensive storage operation hardening
  const originalStorageFrom = supa.storage.from.bind(supa.storage);
  supa.storage.from = function hardenedStorageFrom(bucketName) {
    const bucket = originalStorageFrom(bucketName);
    
    const hardenOperation = (operationName) => async (...args) => {
      // Pre-flight logout check
      if (window.__LOGOUT_IN_PROGRESS__ || window.__SIGNED_OUT__) {
        return { data: [], error: null };
      }

      // Session validation
      if (!(await hasValidSession())) {
        return { data: [], error: null };
      }

      try {
        const result = await bucket[operationName](...args);
        return result;
      } catch (error) {
        const sanitized = sanitizeError(error);
        
        // Check if error is auth-related and update logout state
        if (sanitized.includes('Invalid JWT') || sanitized.includes('expired') || sanitized.includes('unauthorized')) {
          window.__SIGNED_OUT__ = true;
        }
        
        return { data: [], error: { message: sanitized } };
      }
    };

    // Proxy all storage methods for comprehensive protection
    return new Proxy(bucket, {
      get(target, property, receiver) {
        if (typeof target[property] === 'function' && 
            ['list', 'search', 'download', 'upload', 'remove', 'update'].includes(property)) {
          return hardenOperation(property);
        }
        return Reflect.get(target, property, receiver);
      }
    });
  };

  // Global unhandled promise rejection monitoring
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    const sanitized = sanitizeError(error);
    
    // Suppress auth-related errors during logout
    if (window.__LOGOUT_IN_PROGRESS__ || window.__SIGNED_OUT__) {
      if (sanitized.includes('JWT') || sanitized.includes('auth') || sanitized.includes('session')) {
        event.preventDefault();
        return;
      }
    }
    
  });

  /* --------------------------- (B) ENHANCED ROLE MANAGEMENT SYSTEM -------------------------- */

  const ROLE_CACHE_TTL = 30000; // 30 seconds for faster updates
  const roleCache = new Map(); // eventId -> { role, timestamp, realtimeSubscription }

  async function fetchUserRole(eventId) {
    try {
      if (!(await hasValidSession())) return 'viewer';
      
      const { data: { session } } = await supa.auth.getSession();
      if (!session?.user?.id) return 'viewer';

      // Check direct role membership
      const { data: roleData, error: roleError } = await supa
        .from('event_user_roles')
        .select('role')
        .eq('event_id', eventId)
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (roleError) {
      }

      if (roleData?.role) return roleData.role;

      // Check event ownership as fallback
      const { data: eventData, error: eventError } = await supa
        .from('events')
        .select('user_id, created_by')
        .eq('id', eventId)
        .maybeSingle();

      if (eventError) {
        return 'viewer';
      }

      const isOwner = eventData && session.user.id && 
                     (eventData.user_id === session.user.id || eventData.created_by === session.user.id);
      
      return isOwner ? 'admin' : 'viewer';
    } catch (error) {
      return 'viewer';
    }
  }

  async function getUserRole(eventId, options = {}) {
    const { force = false } = options;
    
    try {
      const now = Date.now();
      const cached = roleCache.get(eventId);
      
      // Return cached role if valid and not forcing refresh
      if (!force && cached && (now - cached.timestamp) < ROLE_CACHE_TTL) {
        return cached.role;
      }

      // Fetch fresh role
      const role = await fetchUserRole(eventId);
      
      // Update cache
      roleCache.set(eventId, { 
        role, 
        timestamp: now,
        realtimeSubscription: cached?.realtimeSubscription 
      });
      
      // Expose for external access
      window.__EVENT_ROLES__ = window.__EVENT_ROLES__ || {};
      window.__EVENT_ROLES__[eventId] = role;
      
      return role;
    } catch (error) {
      return 'viewer';
    }
  }

  function canEditWithRole(role) {
    return role === 'admin' || role === 'editor';
  }

  async function canUserEditEvent(eventId, options = {}) {
    const role = await getUserRole(eventId, options);
    return canEditWithRole(role);
  }

  function invalidateRoleCache(eventId) {
    if (eventId) {
      const cached = roleCache.get(eventId);
      if (cached?.realtimeSubscription) {
        try {
          supa.removeChannel(cached.realtimeSubscription);
        } catch (error) {
        }
      }
      roleCache.delete(eventId);
    } else {
      // Clear all cache
      roleCache.forEach((cached, key) => {
        if (cached?.realtimeSubscription) {
          try {
            supa.removeChannel(cached.realtimeSubscription);
          } catch (error) {
          }
        }
      });
      roleCache.clear();
    }
    
    if (window.__EVENT_ROLES__) {
      if (eventId) {
        delete window.__EVENT_ROLES__[eventId];
      } else {
        window.__EVENT_ROLES__ = {};
      }
    }
  }

  async function forceRoleRefresh(eventId) {
    return await getUserRole(eventId, { force: true });
  }

  // Global Role API
  window.RoleAPI = {
    getRole: getUserRole,
    canEditEvent: canUserEditEvent,
    forceRefresh: forceRoleRefresh,
    invalidate: invalidateRoleCache,
    canEdit: canEditWithRole,
    _debug: () => new Map(roleCache)
  };

  // Enhanced event listening for role updates
  let roleListenersInitialized = false;

  function initializeRoleListeners() {
    if (roleListenersInitialized) return;

    // Listen for role update events
    window.addEventListener('event:role-updated', async (event) => {
      const { eventId, userId, role } = event.detail || {};
      if (!eventId) return;
      
      
      // Force refresh and notify
      await forceRoleRefresh(eventId);
      window.dispatchEvent(new CustomEvent('event:role-refreshed', { 
        detail: { eventId, userId, role } 
      }));
    });

    // Listen for collaborator system updates
    window.addEventListener('collaboratorUpdated', async (event) => {
      const { eventId, userId, role } = event.detail || {};
      if (!eventId) return;
      
      await forceRoleRefresh(eventId);
    });

    // Auto-refresh roles on navigation
    window.addEventListener('hashchange', async () => {
      try {
        const match = location.hash.match(/\/event\/(?:view|edit)\/([a-f0-9-]{36})/i);
        if (match) {
          const eventId = match[1];
          await forceRoleRefresh(eventId);
        }
      } catch (error) {
      }
    });

    roleListenersInitialized = true;
  }

  // Initialize role listeners
  initializeRoleListeners();

  // Cleanup on logout
  window.addEventListener('beforeunload', () => {
    invalidateRoleCache();
  });

})();

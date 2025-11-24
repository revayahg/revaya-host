// Enhanced logout guard with automatic interception and better error handling
(function() {
  const supa = window.supabaseClient;
  if (!supa) {
    return;
  }

  let isLoggingOut = false;
  
  // Better error serialization to prevent "[object Object]" displays
  function serializeError(err) {
    if (err instanceof Error) {
      return {
        name: err.name,
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        stack: err.stack?.split('\n').slice(0, 3) // First 3 lines only
      };
    }
    return err;
  }

  // Get current session safely
  async function getSessionSafe() {
    try {
      const { data: { session } = {} } = await supa.auth.getSession();
      return session || null;
    } catch (e) {
      return null;
    }
  }

  // Mark logout state and cancel ongoing operations
  const originalSignOut = supa.auth.signOut;
  supa.auth.signOut = async function(...args) {
    isLoggingOut = true;
    console.debug('🔒 Logout initiated - blocking new Supabase calls');
    
    // Cancel any ongoing subscriptions
    try {
      if (supa.removeAllChannels) {
        supa.removeAllChannels();
      }
    } catch (e) { 
      console.debug('Could not remove channels:', serializeError(e));
    }
    
    const result = await originalSignOut.apply(this, args);
    
    // Reset after a delay to allow cleanup
    setTimeout(() => {
      isLoggingOut = false;
      console.debug('🔓 Logout complete - Supabase calls re-enabled');
    }, 2000);
    
    return result;
  };

  // Intercept common Supabase database operations
  if (supa.from) {
    const originalFrom = supa.from;
    supa.from = function(table) {
      const builder = originalFrom.call(this, table);
      
      // Wrap the execute method which actually returns promises
      const originalExecute = builder.execute || (() => Promise.resolve({ data: null, error: null }));
      
      if (builder.execute) {
        builder.execute = function(...args) {
          if (isLoggingOut) {
            console.debug(`🚫 Blocked ${table} query - logout in progress`);
            return Promise.resolve({ data: null, error: null });
          }
          
          const promise = originalExecute.apply(this, args);
          
          // Add better error handling only if it's a promise
          if (promise && typeof promise.catch === 'function') {
            return promise.catch(err => {
              const serialized = serializeError(err);
              throw err;
            });
          }
          
          return promise;
        };
      }
      
      return builder;
    };
  }

  // Intercept storage operations  
  if (supa.storage) {
    const originalStorage = supa.storage.from;
    supa.storage.from = function(bucket) {
      const storage = originalStorage.call(this, bucket);
      
      ['list', 'upload', 'download', 'remove'].forEach(method => {
        const originalMethod = storage[method];
        if (originalMethod) {
          storage[method] = function(...args) {
            if (isLoggingOut) {
              console.debug(`🚫 Blocked storage.${method}() - logout in progress`);
              return Promise.resolve({ data: null, error: null });
            }
            
            const result = originalMethod.apply(this, args);
            
            // Only add catch if result is a promise
            if (result && typeof result.catch === 'function') {
              return result.catch(err => {
                const serialized = serializeError(err);
                throw err;
              });
            }
            
            return result;
          };
        }
      });
      
      return storage;
    };
  }

  // Intercept RPC calls
  if (supa.rpc) {
    const originalRpc = supa.rpc;
    supa.rpc = function(fnName, ...args) {
      if (isLoggingOut) {
        console.debug(`🚫 Blocked rpc.${fnName}() - logout in progress`);
        return Promise.resolve({ data: null, error: null });
      }
      
      const result = originalRpc.apply(this, [fnName, ...args]);
      
      if (result && typeof result.catch === 'function') {
        return result.catch(err => {
          const serialized = serializeError(err);
          throw err;
        });
      }
      
      return result;
    };
  }

  // Expose utilities for manual use if needed
  window.__getSessionSafe = getSessionSafe;
  window.__serializeError = serializeError;

})();
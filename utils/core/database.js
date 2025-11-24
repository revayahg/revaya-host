// Database utility functions for consistent data handling

/**
 * Creates a unique ID for database objects
 * @returns {string} Unique identifier
 */
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Validates object data before database operations
 * @param {Object} data - Data to validate
 * @returns {Object} Cleaned and validated data
 * @throws {Error} If validation fails
 */
function validateObjectData(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
    }

    // Remove undefined values and functions
    const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
        if (value !== undefined && typeof value !== 'function') {
            acc[key] = value;
        }
        return acc;
    }, {});

    if (Object.keys(cleanData).length === 0) {
        throw new Error('Object data cannot be empty');
    }

    return cleanData;
}

/**
 * Adds metadata to database objects
 * @param {Object} data - Original data
 * @returns {Object} Data with metadata
 */
function addMetadata(data) {
    const now = new Date().toISOString();
    return {
        ...data,
        metadata: {
            ...data.metadata,
            lastModified: now,
            version: (data.metadata?.version || 0) + 1
        }
    };
}

/**
 * Get the correct object type for database operations
 * @param {string} type - Base object type
 * @returns {string} Formatted object type
 */
function getObjectType(type) {
    // Map common singular types to their correct database types
    const typeMap = {
        'event': 'supabase_events',  // Use supabase_events for events
        'events': 'supabase_events',
        'vendor': 'vendors',
        'vendors': 'vendors',
        'user': 'users',
        'users': 'users'
    };

    return typeMap[type] || type;
}

/**
 * Creates a new database object with proper structure
 * @param {string} objectType - Type of object to create
 * @param {Object} data - Object data
 * @returns {Promise<Object>} Created object
 */
async function createDatabaseObject(objectType, data) {
    try {
        if (!objectType || typeof objectType !== 'string') {
            throw new Error('Invalid object type');
        }

        const validatedData = validateObjectData(data);
        const objectData = addMetadata(validatedData);
        const dbObjectType = getObjectType(objectType);

        
        const result = await trickleCreateObject(dbObjectType, objectData);
        
        if (!result?.objectId) {
            throw new Error(`Failed to create ${dbObjectType} object`);
        }

        return {
            ...result.objectData,
            id: result.objectId,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Updates an existing database object
 * @param {string} objectType - Type of object to update
 * @param {string} objectId - ID of object to update
 * @param {Object} data - New object data
 * @returns {Promise<Object>} Updated object
 */
async function updateDatabaseObject(objectType, objectId, data) {
    try {
        if (!objectType || !objectId) {
            throw new Error('Invalid object type or ID');
        }

        const validatedData = validateObjectData(data);
        const objectData = addMetadata(validatedData);
        const dbObjectType = getObjectType(objectType);

        
        const result = await trickleUpdateObject(dbObjectType, objectId, objectData);
        
        return {
            ...result.objectData,
            id: result.objectId,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Retrieves a database object
 * @param {string} objectType - Type of object to retrieve
 * @param {string} objectId - ID of object to retrieve
 * @returns {Promise<Object>} Retrieved object
 */
async function getDatabaseObject(objectType, objectId) {
    try {
        if (!objectType || !objectId) {
            throw new Error('Invalid object type or ID');
        }

        const dbObjectType = getObjectType(objectType);
        
        const result = await trickleGetObject(dbObjectType, objectId);
        
        if (!result) {
            throw new Error(`${dbObjectType} object not found`);
        }

        return {
            ...result.objectData,
            id: result.objectId,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Lists database objects of a specific type
 * @param {string} objectType - Type of objects to list
 * @param {Object} options - List options (limit, descent, nextPageToken, userId)
 * @returns {Promise<Object>} List of objects and pagination token
 */
async function listDatabaseObjects(objectType, options = {}) {
    try {
        if (!objectType) {
            throw new Error('Invalid object type');
        }

        const {
            limit = 100,
            descent = true,
            nextPageToken,
            userId
        } = options;

        const dbObjectType = getObjectType(objectType);
        
        // For events, use Supabase directly to handle user_id OR created_by logic
        if (dbObjectType === 'supabase_events' && userId) {
            return await listUserEvents(userId, { limit, descent });
        }
        
        const result = await trickleListObjects(dbObjectType, limit, descent, nextPageToken);
        
        return {
            items: result.items.map(item => ({
                ...item.objectData,
                id: item.objectId,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
            })),
            nextPageToken: result.nextPageToken
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Deletes a database object
 * @param {string} objectType - Type of object to delete
 * @param {string} objectId - ID of object to delete
 * @returns {Promise<boolean>} Success status
 */
async function deleteDatabaseObject(objectType, objectId) {
    try {
        if (!objectType || !objectId) {
            throw new Error('Invalid object type or ID');
        }

        const dbObjectType = getObjectType(objectType);
        
        await trickleDeleteObject(dbObjectType, objectId);
        return true;
    } catch (error) {
        throw error;
    }
}

/**
 * Queries database objects with filtering
 * @param {string} objectType - Type of objects to query
 * @param {Function} filterFn - Filter function
 * @param {Object} options - Query options (limit, descent)
 * @returns {Promise<Array>} Filtered objects
 */
async function queryDatabaseObjects(objectType, filterFn, options = {}) {
    try {
        const { items } = await listDatabaseObjects(objectType, options);
        return items.filter(filterFn);
    } catch (error) {
        throw error;
    }
}

/**
 * Lists events for a user using flexible user field matching
 * @param {string} userId - User ID to search for
 * @param {Object} options - Query options
 * @returns {Promise<Object>} List of events
 */
async function listUserEvents(userId, options = {}) {
    try {
        const { limit = 100, descent = true } = options;
        
        // Query events where user_id OR created_by matches
        const { data: events, error } = await window.supabaseClient
            .from('events')
            .select('*')
            .or(`user_id.eq.${userId},created_by.eq.${userId}`)
            .order('created_at', { ascending: !descent })
            .limit(limit);

        if (error) {
            throw error;
        }

        return {
            items: events || [],
            nextPageToken: null
        };
    } catch (error) {
        throw error;
    }
}

// Export database functions to window object
window.db = {
    create: createDatabaseObject,
    update: updateDatabaseObject,
    get: getDatabaseObject,
    list: listDatabaseObjects,
    delete: deleteDatabaseObject,
    query: queryDatabaseObjects,
    generateId: generateUniqueId,
    listUserEvents: listUserEvents
};

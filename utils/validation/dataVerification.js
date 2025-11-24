// Verify user data integrity
async function verifyUserData(userId) {
  try {
    const user = await trickleGetObject('user', userId);
    if (!user) throw new Error('User not found');

    const verification = {
      id: {
        valid: !!user.objectId,
        error: !user.objectId ? 'Missing user ID' : null
      },
      encryption: {
        valid: !!user.objectData.sensitiveData && !!user.objectData.iv,
        error: !user.objectData.sensitiveData ? 'Missing encrypted data' : null
      },
      password: {
        valid: !!user.objectData.passwordHash && !!user.objectData.passwordSalt,
        error: !user.objectData.passwordHash ? 'Missing password hash' : null
      },
      emailHash: {
        valid: !!user.objectData.emailHash,
        error: !user.objectData.emailHash ? 'Missing email hash' : null
      },
      status: {
        valid: 'isActive' in user.objectData,
        error: !('isActive' in user.objectData) ? 'Missing status flag' : null
      }
    };

    return {
      valid: Object.values(verification).every(v => v.valid),
      verification
    };
  } catch (error) {
    throw error;
  }
}

// Verify event data integrity
async function verifyEventData(eventId, userId) {
  try {
    const event = await trickleGetObject(`event:${userId}`, eventId);
    if (!event) throw new Error('Event not found');

    const vendorCategoryGroups = window.VENDOR_CATEGORIES;
    const allVendorCategories = Object.values(vendorCategoryGroups)
      .flat()
      .map(category => category.name);

    const verification = {
      id: {
        valid: !!event.objectId,
        error: !event.objectId ? 'Missing event ID' : null
      },
      ownership: {
        valid: !!event.objectData.ownerId,
        error: !event.objectData.ownerId ? 'Missing owner ID' : null
      },
      required: {
        valid: !!event.objectData.type && !!event.objectData.date && !!event.objectData.location,
        error: !event.objectData.type ? 'Missing event type' :
               !event.objectData.date ? 'Missing event date' :
               !event.objectData.location ? 'Missing event location' : null
      },
      vendors: {
        valid: Array.isArray(event.objectData.vendorCategories) && 
               event.objectData.vendorCategories.every(cat => allVendorCategories.includes(cat)),
        error: !Array.isArray(event.objectData.vendorCategories) ? 'Invalid vendor categories' :
               'One or more vendor categories are not valid'
      }
    };

    return {
      valid: Object.values(verification).every(v => v.valid),
      verification
    };
  } catch (error) {
    throw error;
  }
}

// Verify vendor profile data integrity
async function verifyVendorData(vendorId, userId) {
  try {
    const vendor = await trickleGetObject(`vendor:${userId}`, vendorId);
    if (!vendor) throw new Error('Vendor not found');

    const vendorCategoryGroups = window.VENDOR_CATEGORIES;
    const allVendorCategories = Object.values(vendorCategoryGroups)
      .flat()
      .map(category => category.name);

    const verification = {
      id: {
        valid: !!vendor.objectId,
        error: !vendor.objectId ? 'Missing vendor ID' : null
      },
      ownership: {
        valid: !!vendor.objectData.ownerId,
        error: !vendor.objectData.ownerId ? 'Missing owner ID' : null
      },
      required: {
        valid: !!vendor.objectData.businessName && 
               !!vendor.objectData.category && 
               allVendorCategories.includes(vendor.objectData.category),
        error: !vendor.objectData.businessName ? 'Missing business name' :
               !vendor.objectData.category ? 'Missing vendor category' :
               'Invalid vendor category'
      },
      portfolio: {
        valid: Array.isArray(vendor.objectData.portfolio),
        error: !Array.isArray(vendor.objectData.portfolio) ? 'Invalid portfolio' : null
      },
      services: {
        valid: Array.isArray(vendor.objectData.services),
        error: !Array.isArray(vendor.objectData.services) ? 'Invalid services' : null
      },
      visibility: {
        valid: 'isPublic' in vendor.objectData,
        error: !('isPublic' in vendor.objectData) ? 'Missing visibility flag' : null
      }
    };

    return {
      valid: Object.values(verification).every(v => v.valid),
      verification
    };
  } catch (error) {
    throw error;
  }
}

// Verify message data integrity
async function verifyMessageData(messageId, userId) {
  try {
    const message = await trickleGetObject(`message:${userId}`, messageId);
    if (!message) throw new Error('Message not found');

    const verification = {
      id: {
        valid: !!message.objectId,
        error: !message.objectId ? 'Missing message ID' : null
      },
      participants: {
        valid: !!message.objectData.senderId && !!message.objectData.recipientId,
        error: !message.objectData.senderId ? 'Missing sender ID' :
               !message.objectData.recipientId ? 'Missing recipient ID' : null
      },
      content: {
        valid: !!message.objectData.body,
        error: !message.objectData.body ? 'Missing message content' : null
      },
      timestamp: {
        valid: !!message.objectData.timestamp,
        error: !message.objectData.timestamp ? 'Missing timestamp' : null
      },
      attachments: {
        valid: Array.isArray(message.objectData.attachments),
        error: !Array.isArray(message.objectData.attachments) ? 'Invalid attachments' : null
      }
    };

    return {
      valid: Object.values(verification).every(v => v.valid),
      verification
    };
  } catch (error) {
    throw error;
  }
}

// Verify task data integrity
async function verifyTaskData(taskId, userId) {
  try {
    const task = await trickleGetObject(`task:${userId}`, taskId);
    if (!task) throw new Error('Task not found');

    const vendorCategoryGroups = window.VENDOR_CATEGORIES;
    const allVendorCategories = Object.values(vendorCategoryGroups)
      .flat()
      .map(category => category.name);

    const verification = {
      id: {
        valid: !!task.objectId,
        error: !task.objectId ? 'Missing task ID' : null
      },
      event: {
        valid: !!task.objectData.eventId,
        error: !task.objectData.eventId ? 'Missing event ID' : null
      },
      creator: {
        valid: !!task.objectData.createdByUserId,
        error: !task.objectData.createdByUserId ? 'Missing creator ID' : null
      },
      timing: {
        valid: !!task.objectData.daysBeforeEvent,
        error: !task.objectData.daysBeforeEvent ? 'Missing timing information' : null
      },
      status: {
        valid: !!task.objectData.status,
        error: !task.objectData.status ? 'Missing status' : null
      },
      category: {
        valid: !task.objectData.category || allVendorCategories.includes(task.objectData.category),
        error: task.objectData.category && !allVendorCategories.includes(task.objectData.category) ? 
               'Invalid vendor category' : null
      }
    };

    return {
      valid: Object.values(verification).every(v => v.valid),
      verification
    };
  } catch (error) {
    throw error;
  }
}

// Verify payment/featured vendor data integrity
async function verifyPaymentData(paymentId, userId) {
  try {
    const payment = await trickleGetObject(`payment:${userId}`, paymentId);
    if (!payment) throw new Error('Payment not found');

    const verification = {
      id: {
        valid: !!payment.objectId,
        error: !payment.objectId ? 'Missing payment ID' : null
      },
      users: {
        valid: !!payment.objectData.userId && !!payment.objectData.vendorId,
        error: !payment.objectData.userId ? 'Missing user ID' :
               !payment.objectData.vendorId ? 'Missing vendor ID' : null
      },
      amount: {
        valid: typeof payment.objectData.amount === 'number' && payment.objectData.amount > 0,
        error: typeof payment.objectData.amount !== 'number' ? 'Invalid amount' : null
      },
      status: {
        valid: !!payment.objectData.status,
        error: !payment.objectData.status ? 'Missing payment status' : null
      },
      featured: {
        valid: !payment.objectData.featuredUntil || new Date(payment.objectData.featuredUntil).getTime() > 0,
        error: payment.objectData.featuredUntil && new Date(payment.objectData.featuredUntil).getTime() <= 0 ?
               'Invalid featured until date' : null
      }
    };

    return {
      valid: Object.values(verification).every(v => v.valid),
      verification
    };
  } catch (error) {
    throw error;
  }
}

// Verify object schema
async function verifyObjectSchema(objectType, objectData) {
  try {
    const vendorCategoryGroups = window.VENDOR_CATEGORIES;
    const allVendorCategories = Object.values(vendorCategoryGroups)
      .flat()
      .map(category => category.name);

    const schemas = {
      user: {
        required: ['emailHash', 'passwordHash', 'passwordSalt', 'sensitiveData', 'iv', 'isActive'],
        optional: ['companyName', 'jobTitle', 'profilePicture', 'lastLoginAt', 'lastLogoutAt']
      },
      event: {
        required: ['ownerId', 'type', 'date', 'location', 'vendorCategories'],
        optional: ['description', 'attendees', 'budget', 'isPublic', 'eventMap']
      },
      vendor: {
        required: ['ownerId', 'businessName', 'category', 'isPublic'],
        optional: ['portfolio', 'services', 'licenses', 'socialMedia', 'operatingHours']
      },
      message: {
        required: ['senderId', 'recipientId', 'body', 'timestamp'],
        optional: ['eventId', 'attachments', 'isRead']
      },
      task: {
        required: ['eventId', 'createdByUserId', 'status', 'daysBeforeEvent'],
        optional: ['assignedVendorId', 'description', 'priority', 'completedAt']
      },
      payment: {
        required: ['userId', 'vendorId', 'amount', 'status'],
        optional: ['featuredUntil', 'transactionId', 'paymentMethod']
      }
    };

    const schema = schemas[objectType.split(':')[0]];
    if (!schema) {
      throw new Error(`Unknown object type: ${objectType}`);
    }

    // Check required fields
    const missingRequired = schema.required.filter(field => !objectData[field]);
    if (missingRequired.length > 0) {
      throw new Error(`Missing required fields: ${missingRequired.join(', ')}`);
    }

    // Additional validation for vendor categories
    if (objectData.vendorCategories) {
      const invalidCategories = objectData.vendorCategories.filter(
        cat => !allVendorCategories.includes(cat)
      );
      if (invalidCategories.length > 0) {
        throw new Error(`Invalid vendor categories: ${invalidCategories.join(', ')}`);
      }
    }

    // Validate field types
    const validation = {
      emailHash: value => typeof value === 'string' && value.length > 0,
      passwordHash: value => typeof value === 'string' && value.length > 0,
      amount: value => typeof value === 'number' && value > 0,
      date: value => !isNaN(new Date(value).getTime()),
      isPublic: value => typeof value === 'boolean',
      timestamp: value => !isNaN(new Date(value).getTime()),
      status: value => typeof value === 'string' && value.length > 0,
      category: value => !value || allVendorCategories.includes(value)
    };

    for (const [field, value] of Object.entries(objectData)) {
      if (validation[field] && !validation[field](value)) {
        throw new Error(`Invalid value for field: ${field}`);
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

window.verifyUserData = verifyUserData;
window.verifyEventData = verifyEventData;
window.verifyVendorData = verifyVendorData;
window.verifyMessageData = verifyMessageData;
window.verifyTaskData = verifyTaskData;
window.verifyPaymentData = verifyPaymentData;
window.verifyObjectSchema = verifyObjectSchema;

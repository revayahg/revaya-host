// Soft delete an object
async function softDeleteObject(objectType, objectId) {
  try {
    const object = await trickleGetObject(objectType, objectId);
    if (!object) return;

    await trickleUpdateObject(objectType, objectId, {
      ...object.objectData,
      deleted: true,
      deletedAt: new Date().toISOString()
    });
  } catch (error) {
    throw error;
  }
}

// Delete all user-related data
async function deleteUserData(userId) {
  try {
    const objectTypes = [
      `event:${userId}`,
      `vendor:${userId}`,
      `message:${userId}`,
      `task:${userId}`,
      `payment:${userId}`
    ];

    // Soft delete all related objects
    for (const objectType of objectTypes) {
      const objects = await trickleListObjects(objectType, 1000, true);
      for (const obj of objects.items) {
        await softDeleteObject(objectType, obj.objectId);
      }
    }

    // Anonymize user data
    const anonymizedData = {
      fullName: '[Deleted User]',
      email: `deleted_${userId}@placeholder.com`,
      deleted: true,
      deletedAt: new Date().toISOString()
    };

    await trickleUpdateObject('user', userId, anonymizedData);
  } catch (error) {
    throw error;
  }
}

// Deactivate account
async function deactivateAccount(userId) {
  try {
    const user = await trickleGetObject('user', userId);
    if (!user) return;

    await trickleUpdateObject('user', userId, {
      ...user.objectData,
      active: false,
      deactivatedAt: new Date().toISOString()
    });
  } catch (error) {
    throw error;
  }
}

// Reactivate account
async function reactivateAccount(userId) {
  try {
    const user = await trickleGetObject('user', userId);
    if (!user) return;

    await trickleUpdateObject('user', userId, {
      ...user.objectData,
      active: true,
      deactivatedAt: null
    });
  } catch (error) {
    throw error;
  }
}

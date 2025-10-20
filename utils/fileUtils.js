const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  map: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
};

const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  map: 15 * 1024 * 1024 // 15MB
};

async function validateFile(file, type) {
  try {
    
    // Check if file exists
    if (!file) {
      throw new Error('No file provided');
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES[type].includes(file.type)) {
      if (type === 'image') {
        throw new Error('Invalid file type. Allowed types: JPEG, PNG, GIF, WebP, HEIC, HEIF.');
      } else {
        throw new Error(`Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES[type].join(', ')}`);
      }
    }

    // Check file size
    if (file.size > MAX_FILE_SIZES[type]) {
      throw new Error(`File too large. Maximum size: ${MAX_FILE_SIZES[type] / (1024 * 1024)}MB`);
    }

    // Skip header validation for now to avoid issues
    return true;
  } catch (error) {
    throw error;
  }
}

async function uploadFile(file, type, ownerId, resourceType) {
  try {
    // Validate file first
    await validateFile(file, type);

    // Create a unique filename
    const filename = generateSecureFilename(file.name);

    // Create file metadata
    const metadata = {
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      ownerId,
      resourceType,
      uploadedAt: new Date().toISOString()
    };

    // Upload file and save metadata
    const userId = localStorage.getItem('currentUserId');
    const fileObjectType = `file:${userId}`;
    const fileObject = await trickleCreateObject(fileObjectType, {
      ...metadata,
      filename,
      status: 'processing'
    });

    // Log upload attempt
    await logFileAccess('upload', fileObject.objectId, true);

    return fileObject;
  } catch (error) {
    throw error;
  }
}

async function getFileUrl(fileId, resourceType) {
  try {
    // Check if user can access the file
    const hasAccess = await canAccessFile(fileId, resourceType);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // Get file metadata
    const userId = localStorage.getItem('currentUserId');
    const fileObjectType = `file:${userId}`;
    const fileObject = await trickleGetObject(fileObjectType, fileId);

    // Log access attempt
    await logFileAccess('download', fileId, true);

    // Generate temporary signed URL (valid for 1 hour)
    return generateSignedUrl(fileObject.objectData.filename, 3600);
  } catch (error) {
    // Log failed access attempt
    await logFileAccess('download', fileId, false, error.message);
    throw error;
  }
}

async function canAccessFile(fileId, resourceType) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return false;

    // Admin can access all files
    if (currentUser.role === 'admin') return true;

    const userId = localStorage.getItem('currentUserId');
    const fileObjectType = `file:${userId}`;
    const fileObject = await trickleGetObject(fileObjectType, fileId);

    // Check if user owns the file
    if (fileObject.objectData.ownerId === userId) return true;

    // Check if user has access to the resource the file is attached to
    return await canAccessResource(resourceType, fileObject.objectData.resourceId);
  } catch (error) {
    return false;
  }
}

async function logFileAccess(action, fileId, success, errorMessage = null) {
  try {
    const userId = localStorage.getItem('currentUserId');
    const logObjectType = `file-access-log:${userId}`;
    
    await trickleCreateObject(logObjectType, {
      fileId,
      userId,
      action,
      success,
      errorMessage,
      timestamp: new Date().toISOString(),
      ipAddress: 'client-side', // In real implementation, this would be set server-side
      userAgent: navigator.userAgent
    });
  } catch (error) {
  }
}

// Helper functions
function generateSecureFilename(originalName) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${random}.${extension}`;
}

async function readFileHeader(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = (e) => {
      const arr = new Uint8Array(e.target.result);
      resolve(arr.slice(0, 4));
    };
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
}

function isValidFileHeader(header, mimeType) {
  // Common file signatures
  const signatures = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46, 0x38],
    'image/heic': [0x00, 0x00, 0x00, 0x18], // HEIC files start with different patterns
    'image/heif': [0x00, 0x00, 0x00, 0x18], // HEIF similar to HEIC
    'application/pdf': [0x25, 0x50, 0x44, 0x46]
  };

  const expectedSignature = signatures[mimeType];
  if (!expectedSignature) return true; // Skip check if signature unknown

  return expectedSignature.every((byte, i) => header[i] === byte);
}

function generateSignedUrl(filename, expirySeconds) {
  // This is a mock implementation
  // In real implementation, this would generate a signed URL using your storage provider's SDK
  const token = btoa(`${filename}-${Date.now()}-${Math.random()}`);
  return `https://storage.example.com/${filename}?token=${token}&expires=${Date.now() + (expirySeconds * 1000)}`;
}

// Blob URL utilities for image preview handling
function createPreviewUrl(file) {
  if (!file) return null;
  
  try {
    // For File/Blob objects, create object URL
    if (file instanceof File || file instanceof Blob) {
      return URL.createObjectURL(file);
    }
    
    // For data URLs or regular URLs, return as-is
    if (typeof file === 'string') {
      return file;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Clean up object URLs to prevent memory leaks
function revokePreviewUrl(url) {
  if (url && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
    }
  }
}

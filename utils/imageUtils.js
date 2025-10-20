// Image configuration constants
const IMAGE_CONFIG = {
  maxWidth: 800,
  maxHeight: 800,
  maxFileSize: 5 * 1024 * 1024, // 5MB for initial upload
  compressedMaxSize: 1024 * 1024, // 1MB after compression
  quality: 0.7,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
};

function validateImage(file) {
  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }

  if (!IMAGE_CONFIG.allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or HEIC image.' };
  }

  if (file.size > IMAGE_CONFIG.maxFileSize) {
    return { isValid: false, error: `File size exceeds ${IMAGE_CONFIG.maxFileSize / (1024 * 1024)}MB limit` };
  }

  return { isValid: true, error: null };
}

async function convertHeicToJpeg(file) {
  try {
    if (!window.heic2any) {
      throw new Error('HEIC converter not available. Please refresh the page and try again.');
    }

    const convertedBlob = await window.heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.8
    });

    // Convert blob to File object
    const jpegFile = new File(
      [convertedBlob], 
      file.name.replace(/\.[^/.]+$/, '.jpg'), 
      { type: 'image/jpeg' }
    );

    return jpegFile;
  } catch (error) {
    throw new Error('Failed to convert HEIC image. Please try uploading a JPEG or PNG instead.');
  }
}

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > IMAGE_CONFIG.maxWidth) {
            height *= IMAGE_CONFIG.maxWidth / width;
            width = IMAGE_CONFIG.maxWidth;
          }
        } else {
          if (height > IMAGE_CONFIG.maxHeight) {
            width *= IMAGE_CONFIG.maxHeight / height;
            height = IMAGE_CONFIG.maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress with reduced quality
        const compressedDataUrl = canvas.toDataURL('image/jpeg', IMAGE_CONFIG.quality);
        
        // Check final size
        const base64Size = compressedDataUrl.length * 0.75;
        if (base64Size > IMAGE_CONFIG.compressedMaxSize) {
          reject(new Error('Image still too large after compression'));
          return;
        }

        resolve(compressedDataUrl);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };

      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = () => {
        reject(new Error('Failed to read image file'));
      };
      reader.readAsDataURL(file);
    } catch (error) {
      reject(error);
    }
  });
}

async function handleImageUpload(file, options = {}) {
  try {
    const validation = validateImage(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    let processedFile = file;

    // Convert HEIC/HEIF to JPEG
    if (file.type === 'image/heic' || file.type === 'image/heif') {
      processedFile = await convertHeicToJpeg(file);
    }

    // Compress image
    const compressedImage = await compressImage(processedFile);
    return compressedImage;
  } catch (error) {
    throw error;
  }
}

// Upload image function for FileUpload component
async function uploadImage(file) {
  try {
    const compressedDataUrl = await handleImageUpload(file);
    
    return {
      url: compressedDataUrl,
      filename: file.name,
      size: file.size,
      type: file.type
    };
  } catch (error) {
    throw error;
  }
}

// Export to window object
window.IMAGE_CONFIG = IMAGE_CONFIG;
window.validateImage = validateImage;
window.compressImage = compressImage;
window.handleImageUpload = handleImageUpload;
window.uploadImage = uploadImage;

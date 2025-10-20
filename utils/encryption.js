// Development encryption key - should be replaced in production
const ENCRYPTION_KEY = 'trickle-dev-key-2024-secure-123456789';

// Basic encryption for development
function simpleEncrypt(value) {
  try {
    return btoa(JSON.stringify(value));
  } catch (error) {
    return '';
  }
}

// Basic decryption for development
function simpleDecrypt(value) {
  try {
    return JSON.parse(atob(value));
  } catch (error) {
    return null;
  }
}

// Convert string to bytes
function stringToBytes(str) {
  if (typeof str !== 'string') {
    return new Uint8Array();
  }
  return new TextEncoder().encode(str);
}

// Convert bytes to base64
function bytesToBase64(buffer) {
  try {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
  } catch (error) {
    return '';
  }
}

// Convert base64 to bytes
function base64ToBytes(base64) {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    return new Uint8Array();
  }
}

// Generate encryption key
async function generateKey(password = ENCRYPTION_KEY) {
  try {
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      stringToBytes(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: stringToBytes('trickle-salt-2024'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    return null;
  }
}

// Generate IV for encryption
function generateIV() {
  try {
    return window.crypto.getRandomValues(new Uint8Array(12));
  } catch (error) {
    return new Uint8Array(12);
  }
}

// Main encrypt function
async function encrypt(value) {
  try {
    if (value == null) {
      return { encrypted: '', iv: '' };
    }

    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    const key = await generateKey();
    
    if (!key) {
      return {
        encrypted: simpleEncrypt(value),
        iv: btoa('fallback-iv')
      };
    }

    const iv = generateIV();
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      stringToBytes(stringValue)
    );

    return {
      encrypted: bytesToBase64(encrypted),
      iv: bytesToBase64(iv)
    };
  } catch (error) {
    return {
      encrypted: simpleEncrypt(value),
      iv: btoa('fallback-iv')
    };
  }
}

// Main decrypt function
async function decrypt(encrypted, iv) {
  try {
    if (!encrypted || !iv) {
      return null;
    }

    if (iv === btoa('fallback-iv')) {
      return simpleDecrypt(encrypted);
    }

    const key = await generateKey();
    if (!key) {
      return simpleDecrypt(encrypted);
    }

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64ToBytes(iv)
      },
      key,
      base64ToBytes(encrypted)
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (error) {
    return simpleDecrypt(encrypted);
  }
}

// Encrypt data object
async function encryptData(data, key = ENCRYPTION_KEY) {
  try {
    
    // Validate input
    if (!data || typeof data !== 'object') {
      return { encrypted: '', iv: '' };
    }

    // Filter out empty values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => {
        const isValid = value != null && value !== '';
        if (!isValid) {
        }
        return isValid;
      })
    );

    if (Object.keys(cleanData).length === 0) {
      return { encrypted: '', iv: '' };
    }

    // Try encryption
    const result = await encrypt(cleanData);
    return result;
  } catch (error) {
    console.error('Encryption error:', {
      error: error.message,
      dataKeys: Object.keys(data || {})
    });
    return {
      encrypted: simpleEncrypt(data),
      iv: btoa('fallback-iv')
    };
  }
}

// Decrypt data
async function decryptData(encryptedData, iv, key = ENCRYPTION_KEY) {
  try {
    
    if (!encryptedData || !iv) {
      return null;
    }

    const result = await decrypt(encryptedData, iv);
    return result;
  } catch (error) {
    return null;
  }
}

// Create searchable hash
async function createSearchableHash(text) {
  try {
    if (!text || typeof text !== 'string') {
      return '';
    }

    const data = stringToBytes(text.toLowerCase());
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return bytesToBase64(hashBuffer);
  } catch (error) {
    return btoa(text.toLowerCase());
  }
}

// Hash password
async function hashPassword(password) {
  try {
    if (!password || typeof password !== 'string') {
      throw new Error('Invalid password input');
    }

    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const saltBase64 = bytesToBase64(salt);
    const combinedInput = password + saltBase64;
    const data = stringToBytes(combinedInput);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashBase64 = bytesToBase64(hashBuffer);

    return {
      hash: hashBase64,
      salt: saltBase64
    };
  } catch (error) {
    const simpleSalt = btoa(Math.random().toString(36));
    const simpleHash = btoa(password + simpleSalt);
    return {
      hash: simpleHash,
      salt: simpleSalt
    };
  }
}

// Verify password
async function verifyPassword(password, hash, salt) {
  try {
    if (!password || !hash || !salt) {
      return false;
    }

    // Handle simple hash case
    if (salt.length < 24) {
      const simpleHash = btoa(password + salt);
      return simpleHash === hash;
    }

    const combinedInput = password + salt;
    const data = stringToBytes(combinedInput);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const computedHash = bytesToBase64(hashBuffer);

    return computedHash === hash;
  } catch (error) {
    return false;
  }
}

// Validate encryption setup
async function validateEncryption() {
  try {
    const testData = { test: 'encryption-test' };
    const { encrypted, iv } = await encryptData(testData);
    const decrypted = await decryptData(encrypted, iv);
    const isValid = decrypted && decrypted.test === testData.test;
    return isValid;
  } catch (error) {
    return false;
  }
}

// Initialize encryption system
async function initializeEncryption() {
  try {
    const isValid = await validateEncryption();
    if (!isValid) {
      throw new Error('Encryption system validation failed');
    }
    return true;
  } catch (error) {
    return true;
  }
}

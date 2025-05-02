import CryptoJS from 'crypto-js';

// Generate a static encryption key based on browser fingerprint
// This isn't perfectly secure, but adds a layer of protection
const getEncryptionKey = (): string => {
  const browserInfo = [
    navigator.userAgent,
    navigator.language,
    window.screen.colorDepth,
    window.screen.width + 'x' + window.screen.height
  ].join('|');
  
  // Create a relatively stable but unique key for this browser
  return CryptoJS.SHA256(browserInfo).toString();
};

// Hard-coded fallback key in case the fingerprinting fails
const FALLBACK_KEY = 'gBroadcast-20250608-default-secure-key';

// Encrypt data before storing
export const encryptData = (data: any): string => {
  if (!data) return '';
  
  try {
    const jsonString = JSON.stringify(data);
    
    // Try to use the browser fingerprint key
    let key = getEncryptionKey();
    
    // If key generation fails, use fallback
    if (!key) {
      console.warn('Using fallback encryption key');
      key = FALLBACK_KEY;
    }
    
    const encrypted = CryptoJS.AES.encrypt(jsonString, key).toString();
    return encrypted;
  } catch (error) {
    console.error('Error encrypting data:', error);
    // Last resort - store as JSON string
    return JSON.stringify({
      _unencrypted: true,
      data
    });
  }
};

// Decrypt data after retrieving
export const decryptData = (encryptedData: string): any => {
  if (!encryptedData) return null;
  
  try {
    // Check if this is an unencrypted fallback
    if (encryptedData.startsWith('{"_unencrypted":true')) {
      try {
        const parsed = JSON.parse(encryptedData);
        return parsed.data;
      } catch (e) {
        console.error('Error parsing unencrypted data:', e);
        return null;
      }
    }
    
    // Try to use the browser fingerprint key
    let key = getEncryptionKey();
    
    // If key generation fails, try fallback
    if (!key) {
      console.warn('Using fallback decryption key');
      key = FALLBACK_KEY;
    }
    
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
    
    // Check if decrypted data is valid before converting to string
    if (decrypted.sigBytes <= 0) {
      console.error('Invalid decrypted data');
      return null;
    }
    
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    
    // Check if the result is valid before parsing
    if (!jsonString || jsonString.length === 0) {
      console.error('Decrypted data is empty or invalid');
      return null;
    }
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error decrypting data:', error);
    
    // Try with fallback key if primary key failed
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, FALLBACK_KEY);
      const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (jsonString && jsonString.length > 0) {
        return JSON.parse(jsonString);
      }
    } catch (fallbackError) {
      console.error('Fallback decryption also failed:', fallbackError);
    }
    
    return null;
  }
};

// Handle storage limits by chunking large data if necessary
const MAX_ITEM_SIZE = 2 * 1024 * 1024; // 2MB, slightly under localStorage limits

// User preferences storage keys
const PREFERENCE_KEYS = {
  THEME: 'user_pref_theme',
  FILTERS: 'user_pref_filters',
  VIEW_MODE: 'user_pref_view_mode',
  LAST_SYNC: 'user_pref_last_sync'
};

// Direct storage functions without encryption as fallback
const directStorage = {
  setItem: (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Failed to store data for key ${key} directly:`, e);
    }
  },
  getItem: (key: string) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error(`Failed to get data for key ${key} directly:`, e);
      return null;
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Failed to remove data for key ${key} directly:`, e);
    }
  }
};

// Secure wrapper for localStorage
export const secureStorage = {
  setItem: (key: string, value: any) => {
    try {
      const encrypted = encryptData(value);
      
      // Check if data exceeds size limit
      if (encrypted.length > MAX_ITEM_SIZE) {
        console.warn(`Data for key ${key} is large (${Math.round(encrypted.length/1024)}KB). Consider optimizing.`);
      }
      
      localStorage.setItem(key, encrypted);
      
      // Verify storage worked
      const test = localStorage.getItem(key);
      if (!test) {
        throw new Error('Storage verification failed: item not found after storing');
      }
    } catch (error) {
      console.error(`Error storing data for key ${key}:`, error);
      
      // If encryption fails, try storing directly with JSON as a fallback
      try {
        directStorage.setItem(key, value);
        console.warn(`Fell back to direct storage for key ${key}`);
      } catch (directError) {
        console.error(`Direct storage also failed for key ${key}:`, directError);
      }
      
      // If it's a quota error, try clearing other data
      if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.warn('Storage quota exceeded. Trying to clear old data...');
        
        // Try to clear non-essential data
        try {
          secureStorage.clearContactsData();
        } catch (e) {
          console.error('Failed to recover storage space:', e);
        }
      }
    }
  },
  
  getItem: (key: string) => {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      
      // Try to decrypt
      const decrypted = decryptData(encrypted);
      
      // If decryption fails, try to parse as direct JSON as a fallback
      if (decrypted === null && encrypted) {
        try {
          return directStorage.getItem(key);
        } catch (directError) {
          console.warn(`Corrupted data detected for key: ${key}. Removing it.`, directError);
          localStorage.removeItem(key);
          return null;
        }
      }
      
      return decrypted;
    } catch (e) {
      console.error(`Error getting item from secure storage for key ${key}:`, e);
      
      // Try direct storage as fallback
      try {
        return directStorage.getItem(key);
      } catch (directError) {
        console.error(`Direct storage retrieval also failed for key ${key}:`, directError);
        localStorage.removeItem(key);
        return null;
      }
    }
  },
  
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item for key ${key}:`, error);
    }
  },
  
  // Helper to clear all contact-related keys if corruption is detected
  clearContactsData: () => {
    const contactKeys = [
      'google_contacts',
      'google_contact_groups',
      'google_contacts_metadata'
    ];
    
    contactKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error(`Failed to remove ${key}:`, e);
      }
    });
    console.info('Cleared all contacts data');
  },
  
  // User preferences methods
  preferences: {
    // Save filter preferences
    saveFilters: (filters: any) => {
      try {
        secureStorage.setItem(PREFERENCE_KEYS.FILTERS, {
          ...filters,
          lastUpdated: new Date().toISOString()
        });
      } catch (e) {
        console.error('Failed to save filters:', e);
        // Try direct storage
        directStorage.setItem(PREFERENCE_KEYS.FILTERS, {
          ...filters,
          lastUpdated: new Date().toISOString()
        });
      }
    },
    
    // Get saved filter preferences
    getFilters: () => {
      try {
        return secureStorage.getItem(PREFERENCE_KEYS.FILTERS) || null;
      } catch (e) {
        console.error('Failed to get filters:', e);
        return directStorage.getItem(PREFERENCE_KEYS.FILTERS);
      }
    },
    
    // Save UI theme preference
    saveTheme: (theme: 'light' | 'dark' | 'system') => {
      try {
        secureStorage.setItem(PREFERENCE_KEYS.THEME, theme);
      } catch (e) {
        directStorage.setItem(PREFERENCE_KEYS.THEME, theme);
      }
    },
    
    // Get saved theme preference
    getTheme: (): 'light' | 'dark' | 'system' => {
      try {
        return secureStorage.getItem(PREFERENCE_KEYS.THEME) || 'system';
      } catch (e) {
        return directStorage.getItem(PREFERENCE_KEYS.THEME) || 'system';
      }
    },
    
    // Save view mode preference (list, grid, etc)
    saveViewMode: (mode: string) => {
      try {
        secureStorage.setItem(PREFERENCE_KEYS.VIEW_MODE, mode);
      } catch (e) {
        directStorage.setItem(PREFERENCE_KEYS.VIEW_MODE, mode);
      }
    },
    
    // Get saved view mode
    getViewMode: () => {
      try {
        return secureStorage.getItem(PREFERENCE_KEYS.VIEW_MODE) || 'list';
      } catch (e) {
        return directStorage.getItem(PREFERENCE_KEYS.VIEW_MODE) || 'list';
      }
    },
    
    // Save last sync timestamp for particular data type
    saveLastSync: (dataType: string, timestamp: number) => {
      try {
        const currentSyncs = secureStorage.getItem(PREFERENCE_KEYS.LAST_SYNC) || {};
        secureStorage.setItem(PREFERENCE_KEYS.LAST_SYNC, {
          ...currentSyncs,
          [dataType]: timestamp
        });
      } catch (e) {
        const currentSyncs = directStorage.getItem(PREFERENCE_KEYS.LAST_SYNC) || {};
        directStorage.setItem(PREFERENCE_KEYS.LAST_SYNC, {
          ...currentSyncs,
          [dataType]: timestamp
        });
      }
    },
    
    // Get last sync timestamp for data type
    getLastSync: (dataType: string) => {
      try {
        const syncs = secureStorage.getItem(PREFERENCE_KEYS.LAST_SYNC) || {};
        return syncs[dataType] || null;
      } catch (e) {
        const syncs = directStorage.getItem(PREFERENCE_KEYS.LAST_SYNC) || {};
        return syncs[dataType] || null;
      }
    }
  },
  
  // Clear all auth data for a fresh login
  clearAuthData: () => {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('auth_tokens');
      console.info('Cleared all auth data');
    } catch (e) {
      console.error('Failed to clear auth data:', e);
    }
  }
};
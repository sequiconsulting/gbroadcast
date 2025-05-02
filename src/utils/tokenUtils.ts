import { jwtDecode } from 'jwt-decode';
import { secureStorage } from './secureStorage';

interface TokenData {
  token: string;
  refreshToken?: string;
  expiresAt: number; // Timestamp when token expires
}

interface DecodedToken {
  exp?: number;
  iat?: number;
  [key: string]: any;
}

// Convert JWT expiration to timestamp
export const getTokenExpiration = (token: string): number => {
  try {
    // First try to decode as JWT - Google tokens are not always JWTs
    const decoded = jwtDecode<DecodedToken>(token);
    // If token has exp claim, use it (exp is in seconds since epoch)
    if (decoded.exp) {
      return decoded.exp * 1000; // Convert to milliseconds
    }
  } catch (error) {
    console.warn("Not a JWT token or error decoding token - using default expiration");
    // Ignore errors when not a JWT - Google access tokens are sometimes not JWTs
  }
  
  // Fallback: make token expire in 1 hour (Google's default)
  return Date.now() + 3600 * 1000;
};

// Store tokens securely
export const storeTokens = (token: string, refreshToken?: string): void => {
  try {
    const expiresAt = getTokenExpiration(token);
    
    const tokenData: TokenData = {
      token,
      refreshToken,
      expiresAt
    };
    
    // Store in secure storage
    console.log("Storing token with expiration:", new Date(expiresAt).toISOString());
    secureStorage.setItem('auth_tokens', tokenData);
  } catch (error) {
    console.error("Failed to store tokens:", error);
    
    // Fallback - try to store with minimal data
    try {
      const simpleTokenData: TokenData = {
        token,
        expiresAt: Date.now() + 3600 * 1000
      };
      secureStorage.setItem('auth_tokens', simpleTokenData);
    } catch (fallbackError) {
      console.error("Failed to store tokens even with fallback:", fallbackError);
    }
  }
};

// Get stored tokens
export const getStoredTokens = (): TokenData | null => {
  try {
    const tokenData = secureStorage.getItem('auth_tokens') as TokenData | null;
    if (!tokenData || !tokenData.token) {
      return null;
    }
    return tokenData;
  } catch (error) {
    console.error("Error retrieving stored tokens:", error);
    return null;
  }
};

// Check if token is expired or will expire soon (within 5 minutes)
export const isTokenExpired = (tokenData?: TokenData): boolean => {
  try {
    if (!tokenData) {
      tokenData = getStoredTokens();
    }
    
    if (!tokenData || !tokenData.token) return true;
    
    // Check if token will expire in the next 5 minutes
    const expirationBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    const isExpired = Date.now() + expirationBuffer >= tokenData.expiresAt;
    
    if (isExpired) {
      console.log("Token is expired or will expire soon");
    }
    
    return isExpired;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true; // Assume expired if there's an error
  }
};

// Remove stored tokens
export const clearTokens = (): void => {
  try {
    secureStorage.removeItem('auth_tokens');
  } catch (error) {
    console.error("Error clearing tokens:", error);
    // Try again with direct localStorage access as fallback
    try {
      localStorage.removeItem('auth_tokens');
    } catch (e) {
      // Ignore additional errors
    }
  }
};

// Clear all auth data for debugging
export const clearAllAuthData = (): void => {
  try {
    secureStorage.removeItem('auth_tokens');
    secureStorage.removeItem('user');
    localStorage.removeItem('auth_tokens');
    localStorage.removeItem('user');
    console.log("Cleared all auth data");
  } catch (error) {
    console.error("Error clearing all auth data:", error);
  }
};
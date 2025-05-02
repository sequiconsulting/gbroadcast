import { createContext, useState, useContext, ReactNode, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { secureStorage } from '../utils/secureStorage';
import { storeTokens, getStoredTokens, isTokenExpired, clearTokens } from '../utils/tokenUtils';
import { User, AuthTokens, AuthState } from '../types/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (accessToken: string, user: User) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<string | null>;
  getAccessToken: () => Promise<string | null>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  refreshAccessToken: async () => null,
  getAccessToken: async () => null,
  authError: null,
  clearAuthError: () => {}
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    tokens: null,
    isAuthenticated: false,
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const navigate = useNavigate();
  
  // Use refs to avoid race conditions and track component lifecycle
  const refreshingRef = useRef(false);
  const mountedRef = useRef(true);
  
  // Check if Google Client ID is configured
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const hasValidConfig = Boolean(googleClientId && googleClientId.length > 10);
  
  // Initialize Google login hook (will be used for token refresh)
  const googleLogin = useGoogleLogin({
    onSuccess: (response) => {
      console.log("Google login/refresh success");
      if (response.access_token && mountedRef.current) {
        // Store the new access token
        if (authState.user) {
          console.log("User exists, updating login with new token");
          login(response.access_token, authState.user);
        } else {
          console.log("No user found after token refresh");
        }
        setRefreshing(false);
        refreshingRef.current = false;
      }
    },
    onError: (error) => {
      console.error("Error refreshing token:", error);
      
      if (mountedRef.current) {
        // Set appropriate error message
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.toLowerCase().includes('popup') || 
            errorMessage.toLowerCase().includes('blocked')) {
          setAuthError(
            "The login popup was blocked by your browser. Please allow popups for this website and try again."
          );
        } else if (errorMessage.toLowerCase().includes('invalid_client')) {
          setAuthError(
            "Invalid OAuth Client ID. Please check your Google API configuration."
          );
        } else {
          setAuthError("Authentication failed. Please try logging in again.");
        }
        
        setRefreshing(false);
        refreshingRef.current = false;
        // If refresh fails, log the user out
        logout();
      }
    },
    flow: 'implicit',
    scope: 'email profile https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/drive.appdata',
  });
  
  // Check for saved auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log("Initializing authentication state");
        
        // First check if we have a valid Google configuration
        if (!hasValidConfig) {
          console.error("Missing or invalid Google Client ID");
          setAuthError("Google configuration is missing. Please set up your Google API credentials.");
          return;
        }
        
        const storedUser = secureStorage.getItem('user');
        const storedTokens = getStoredTokens();
        
        if (storedUser) {
          console.log("Found stored user");
        }
        
        if (storedTokens) {
          console.log("Found stored tokens, checking expiration");
        }
        
        if (storedUser && storedTokens && !isTokenExpired(storedTokens)) {
          console.log("Valid user and token found, restoring session");
          if (mountedRef.current) {
            setAuthState({
              user: storedUser,
              tokens: {
                access_token: storedTokens.token,
                refresh_token: storedTokens.refreshToken,
                expires_at: storedTokens.expiresAt
              },
              isAuthenticated: true
            });
          }
          console.log("Restored authentication from local storage");
        } else if (storedUser && storedTokens && isTokenExpired(storedTokens)) {
          // Token is expired, try to refresh
          console.log("Stored token expired, attempting refresh");
          const newToken = await refreshAccessToken();
          if (!newToken && mountedRef.current) {
            // Refresh failed
            console.log("Token refresh failed during initialization");
            logout();
          }
        } else {
          console.log("No valid stored authentication found");
        }
      } catch (error) {
        console.error("Error during auth initialization:", error);
        // Clear auth state if there's an error
        if (mountedRef.current) {
          logout();
        }
      }
    };

    initAuth();
    
    // Set up interval to check token expiration
    const tokenCheckInterval = setInterval(async () => {
      if (authState.isAuthenticated && isTokenExpired() && mountedRef.current) {
        console.log("Token expired or about to expire, refreshing...");
        await refreshAccessToken();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => {
      mountedRef.current = false;
      clearInterval(tokenCheckInterval);
    };
  }, []);
  
  const clearAuthError = useCallback(() => {
    if (mountedRef.current) {
      setAuthError(null);
    }
  }, []);

  const login = useCallback((accessToken: string, userData: User) => {
    console.log("Login called with token and user data");
    
    // Validate required data
    if (!accessToken) {
      console.error("Missing access token in login");
      if (mountedRef.current) {
        setAuthError("Authentication failed: Missing access token");
      }
      return;
    }
    
    if (!userData || !userData.email) {
      console.error("Missing or invalid user data in login");
      if (mountedRef.current) {
        setAuthError("Authentication failed: Missing user information");
      }
      return;
    }
    
    try {
      // Store the user data securely
      secureStorage.setItem('user', userData);
      
      // Store tokens securely
      storeTokens(accessToken);
      
      // Update state
      if (mountedRef.current) {
        setAuthState({
          user: userData,
          tokens: {
            access_token: accessToken,
            expires_at: Date.now() + 3600 * 1000 // Google tokens typically expire after 1 hour
          },
          isAuthenticated: true
        });
        
        // Clear any previous errors
        clearAuthError();
      }
      
      console.log("Authentication completed, navigating to dashboard");
      navigate('/');
    } catch (error) {
      console.error("Error during login:", error);
      if (mountedRef.current) {
        setAuthError("Failed to store authentication data. Please try again.");
      }
    }
  }, [navigate, clearAuthError]);

  const logout = useCallback(() => {
    console.log("Logout called");
    
    try {
      // Clear secure storage
      secureStorage.removeItem('user');
      clearTokens();
      
      // Update state
      if (mountedRef.current) {
        setAuthState({
          user: null,
          tokens: null,
          isAuthenticated: false
        });
      }
      
      console.log("Logged out, navigating to login page");
      navigate('/login');
    } catch (error) {
      console.error("Error during logout:", error);
      // Even if there's an error, still try to navigate to login
      navigate('/login');
    }
  }, [navigate]);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      // Check if Google Client ID is configured
      if (!hasValidConfig) {
        console.error("Cannot refresh token: Missing Google Client ID");
        if (mountedRef.current) {
          setAuthError("Google configuration is missing. Please set up your Google API credentials.");
        }
        return null;
      }
      
      // Prevent multiple simultaneous refresh attempts
      if (refreshingRef.current) {
        console.log("Token refresh already in progress");
        return null;
      }
      
      refreshingRef.current = true;
      if (mountedRef.current) {
        setRefreshing(true);
      }
      
      console.log("Refreshing access token via Google OAuth");
      
      // Google OAuth implementation doesn't support direct refresh tokens in client-side flow
      // We'll need to trigger a new login flow
      googleLogin();
      
      // This won't actually return the new token since the login is async
      // The token will be handled in the onSuccess callback of googleLogin
      return null;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      
      if (mountedRef.current) {
        // Check if the error might be related to popup blocking
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (
          errorMessage.toLowerCase().includes('popup') || 
          errorMessage.toLowerCase().includes('blocked')
        ) {
          setAuthError(
            "The login popup was blocked by your browser. Please allow popups for this website and try again."
          );
        } else {
          setAuthError("Failed to refresh authentication. Please try logging in again.");
        }
        
        setRefreshing(false);
      }
      
      refreshingRef.current = false;
      return null;
    }
  }, [googleLogin, hasValidConfig]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    // Check if token exists and is not expired
    const tokenData = getStoredTokens();
    
    if (!tokenData) {
      console.log("No token data found");
      return null;
    }
    
    if (isTokenExpired()) {
      // Token is expired, try to refresh
      console.log("Token expired, refreshing before API request");
      const newToken = await refreshAccessToken();
      if (newToken) {
        return newToken;
      } else {
        // If refresh fails, log out the user
        if (mountedRef.current) {
          console.log("Token refresh failed, logging out");
          logout();
        }
        return null;
      }
    }
    
    // Return the valid token
    return tokenData.token;
  }, [refreshAccessToken, logout]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Show configuration warning if no client ID
  useEffect(() => {
    if (!hasValidConfig && mountedRef.current) {
      setAuthError("Google Client ID is not configured. Please set up your Google API credentials.");
    }
  }, [hasValidConfig]);

  const value = {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    login,
    logout,
    refreshAccessToken,
    getAccessToken,
    authError,
    clearAuthError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
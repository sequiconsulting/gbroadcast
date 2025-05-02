import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle } from 'lucide-react';

const LoginPage = () => {
  const { isAuthenticated, login, authError, clearAuthError } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Check if Google Client ID is configured
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const hasValidConfig = Boolean(googleClientId && googleClientId.length > 10);

  useEffect(() => {
    // Check for existing authentication status
    if (isAuthenticated) {
      navigate('/');
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [isAuthenticated, navigate]);

  // Clear authentication errors when component unmounts or updates
  useEffect(() => {
    return () => {
      if (mountedRef.current) {
        clearAuthError();
      }
    };
  }, [clearAuthError]);

  // Set local error when auth context error changes
  useEffect(() => {
    if (authError && mountedRef.current) {
      setError(authError);
      setIsLoading(false);
    }
  }, [authError]);

  const googleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      if (!mountedRef.current) return;
      
      console.log("Google login successful, retrieving user info");
      
      try {
        // Get user profile information
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${response.access_token}`,
          },
        });
        
        if (!userInfoResponse.ok) {
          throw new Error('Failed to get user info');
        }
        
        const userInfo = await userInfoResponse.json();
        console.log("User info retrieved successfully");
        
        if (!mountedRef.current) return;
        
        // Log in the user with the new token structure
        login(
          response.access_token, 
          {
            id: userInfo.sub,
            name: userInfo.name,
            email: userInfo.email,
            picture: userInfo.picture
          }
        );
        
        // Important: Once we've called login, we should reset loading state
        setIsLoading(false);
      } catch (error) {
        console.error('Login error:', error);
        if (mountedRef.current) {
          setError('Failed to login with Google. Please try again.');
          setIsLoading(false);
        }
      }
    },
    onError: (errorResponse) => {
      console.error('Google login error:', errorResponse);
      const errMessage = errorResponse instanceof Error 
        ? errorResponse.message 
        : 'Failed to login with Google. Please try again.';
      
      if (!mountedRef.current) return;
      
      // Check if the error might be related to popup blocking
      if (errMessage.toLowerCase().includes('popup') || errMessage.toLowerCase().includes('blocked')) {
        setError("The login popup was blocked by your browser. Please allow popups for this website and try again.");
      } else if (errMessage.toLowerCase().includes('invalid_client')) {
        setError("Invalid OAuth Client ID. Please check your Google API configuration.");
      } else {
        setError(errMessage);
      }
      setIsLoading(false);
    },
    flow: 'implicit', // Specify flow type
    ux_mode: 'popup', // Use popup instead of redirect
    scope: 'email profile https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/drive.appdata',
  });

  const handleLogin = () => {
    if (!hasValidConfig) {
      setError("Google Client ID is not configured. Please set the VITE_GOOGLE_CLIENT_ID environment variable.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    // Trigger the Google OAuth login flow
    googleLogin();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-fadeIn">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">gBroadcast</h1>
          <p className="mt-2 text-sm text-slate-600">
            Send messages to your Google contact groups
          </p>
        </div>
        
        <div className="mt-8 bg-white py-8 px-4 shadow-soft rounded-xl sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 border border-red-200">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Login Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {!hasValidConfig && (
            <div className="mb-4 rounded-lg bg-amber-50 p-4 border border-amber-200">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">Configuration Error</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Google Client ID is not configured. Please add it to the .env.local file:
                  </p>
                  <pre className="mt-2 text-xs bg-amber-100 p-2 rounded border border-amber-200 overflow-auto">
                    VITE_GOOGLE_CLIENT_ID=your_client_id_here
                  </pre>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-6">
            <button
              onClick={handleLogin}
              disabled={isLoading || !hasValidConfig}
              className="w-full flex justify-center py-2.5 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center">
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                    </g>
                  </svg>
                  Sign in with Google
                </span>
              )}
            </button>
            
            <div className="mt-6">
              <p className="text-xs text-center text-slate-600">
                By signing in, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            v0.1.0 • Built with React, TypeScript & Google APIs
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
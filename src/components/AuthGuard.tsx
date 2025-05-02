import { Outlet, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout';
import { AlertTriangle } from 'lucide-react';

const AuthGuard = () => {
  const { isAuthenticated, getAccessToken, authError } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        if (!isAuthenticated) {
          setIsVerifying(false);
          return;
        }
        
        // Try to get a valid token, which will refresh if needed
        const token = await getAccessToken();
        
        if (token) {
          setIsValid(true);
        } else {
          // If we can't get a token, there was an issue with authentication
          setError("Your session is invalid or expired. Please log in again.");
        }
      } catch (error) {
        console.error('Error verifying token:', error);
        setError('Authentication error. Please try logging in again.');
      } finally {
        setIsVerifying(false);
      }
    };
    
    verifyToken();
  }, [isAuthenticated, getAccessToken]);

  // If auth error is present, show it
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Verifying your session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isValid) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        {error && (
          <div className="mb-6 w-full max-w-md bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Authentication Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        <p className="text-slate-700 mb-4">Please log in to continue</p>
        <Navigate to="/login" replace />
      </div>
    );
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

export default AuthGuard;
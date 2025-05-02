import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

export const useSecureApi = () => {
  const { getAccessToken, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  
  // Use a ref to track active requests and pending count
  const pendingRef = useRef<number>(0);
  const abortControllersRef = useRef<AbortController[]>([]);
  const mountedRef = useRef<boolean>(true);

  const fetchWithToken = useCallback(async <T>(url: string, options: ApiOptions = {}): Promise<T | null> => {
    // Create a new AbortController for this request
    const controller = new AbortController();
    abortControllersRef.current.push(controller);
    
    if (mountedRef.current) {
      setIsLoading(true);
      setError(null);
    }
    
    // Update pending count
    pendingRef.current += 1;
    if (mountedRef.current) {
      setPendingRequests(pendingRef.current);
    }
    
    try {
      // Get a valid access token (refreshed if needed)
      const token = await getAccessToken();
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      // Prepare headers with authorization
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      };
      
      // Prepare request body if provided
      let requestBody: string | undefined;
      if (options.body) {
        requestBody = JSON.stringify(options.body);
      }
      
      // Add timeout for request
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      // Make the API request
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: requestBody,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token is invalid or expired
          logout();
          throw new Error('Session expired. Please log in again.');
        }
        
        if (response.status === 403) {
          throw new Error('You do not have permission to access this resource. Check your Google account permissions.');
        }
        
        if (response.status === 429) {
          throw new Error('Too many requests. Please try again later.');
        }
        
        // Try to get error details from response
        let errorMessage = `Request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch (e) {
          // Ignore parse errors
        }
        
        throw new Error(errorMessage);
      }
      
      // Parse and return the response data
      const data = await response.json();
      return data as T;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        const abortError = new Error('Request timed out. Please try again.');
        if (mountedRef.current) {
          setError(abortError);
        }
      } else {
        const apiError = err instanceof Error ? err : new Error('An unknown error occurred');
        if (mountedRef.current) {
          setError(apiError);
        }
      }
      return null;
    } finally {
      // Clean up: remove this controller from the ref
      abortControllersRef.current = abortControllersRef.current.filter(c => c !== controller);
      
      // Update pending count
      pendingRef.current = Math.max(0, pendingRef.current - 1);
      if (mountedRef.current) {
        setPendingRequests(pendingRef.current);
        
        // Only set loading to false if there are no more pending requests
        if (pendingRef.current === 0) {
          setIsLoading(false);
        }
      }
    }
  }, [getAccessToken, logout]);
  
  // Clean up abort controllers on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      // Abort all pending requests
      abortControllersRef.current.forEach(controller => {
        try {
          controller.abort();
        } catch (e) {
          // Ignore abort errors
        }
      });
      abortControllersRef.current = [];
    };
  }, []);
  
  return { fetchWithToken, isLoading, error };
};
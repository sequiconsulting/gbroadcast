import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';

// Get Google Client ID from environment variables
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Log environment configuration (in dev only)
if (import.meta.env.DEV) {
  console.log('Environment:', import.meta.env.MODE);
  console.log('Google Client ID configured:', GOOGLE_CLIENT_ID ? 'Yes' : 'No');
  
  if (!GOOGLE_CLIENT_ID) {
    console.warn('⚠️ Google Client ID is not set! Please add it to .env.local file');
    console.warn('OAuth login will not work without a client ID');
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>
);
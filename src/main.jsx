// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { supabase } from './supabase';

// CRITICAL: Handle magic link hash and persist session
const hash = window.location.hash.substring(1);
if (hash) {
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (accessToken && refreshToken) {
    // Set session
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    }).then(({ data }) => {
      console.log('Session set:', data.session?.user?.email);
      // Clean URL
      window.history.replaceState({}, '', '/');
      // Force reload to load session
      window.location.reload();
    });
  }
}

// Render app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

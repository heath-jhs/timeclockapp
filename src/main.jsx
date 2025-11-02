// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { supabase } from './supabase';

// Handle magic link hash on page load (no await)
const hash = window.location.hash.substring(1);
if (hash) {
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (accessToken && refreshToken) {
    // Set session manually
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    }).then(() => {
      // Clean URL and reload
      window.history.replaceState({}, '', window.location.pathname);
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

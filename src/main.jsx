// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { supabase } from './supabaseClient.js';

// Handle magic link or reset hash
const hash = window.location.hash.substring(1);
if (hash) {
  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const type = params.get('type');

  if (access_token && refresh_token) {
    supabase.auth.setSession({ access_token, refresh_token }).then(() => {
      window.history.replaceState({}, '', '/');
      if (type !== 'recovery') {
        window.location.reload();
      }
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

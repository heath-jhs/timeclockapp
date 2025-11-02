// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { supabase } from './supabase';

const hash = window.location.hash.substring(1);
if (hash) {
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (accessToken && refreshToken) {
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    }).then(() => {
      window.history.replaceState({}, '', '/');
      window.location.reload();
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

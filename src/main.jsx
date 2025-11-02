// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { supabase } from './supabase';

console.log('main.jsx loaded');

const hash = window.location.hash.substring(1);
if (hash) {
  console.log('Hash found:', hash);
  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');

  if (access_token && refresh_token) {
    console.log('Setting session...');
    supabase.auth.setSession({ access_token, refresh_token })
      .then(({ data, error }) => {
        console.log('setSession result:', data, error);
        window.history.replaceState({}, '', '/');
        console.log('Reloading...');
        window.location.reload();
      });
  }
}

// Render
console.log('Rendering App');
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { supabase } from './supabase';

// CRITICAL: Handle magic link hash on page load
const { data: { session } } = await supabase.auth.getSession();
if (session) {
  // Clean URL and reload to ensure session is loaded
  if (window.location.hash) {
    window.history.replaceState({}, '', window.location.pathname);
    window.location.reload();
  }
}

// Render app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

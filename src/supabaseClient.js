// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('FATAL: Supabase configuration missing');
  throw new Error('Supabase env vars missing.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'TimeClockAppAuth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true  // ← CRITICAL FOR INVITE LINKS
  }
});

console.log('Supabase client initialized successfully');
export { supabase };

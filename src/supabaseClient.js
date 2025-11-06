import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Singleton pattern to ensure only one client instance
let supabaseInstance = null;

if (!supabaseInstance) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: 'TimeClockAppAuth', // Custom key to avoid conflicts across tabs
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  console.log('Supabase client initialized'); // Debug initialization
}

export const supabase = supabaseInstance;

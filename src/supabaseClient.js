import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'TimeClockAppAuth', // Custom key to avoid conflicts across tabs
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

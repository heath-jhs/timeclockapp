import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Singleton with check to prevent multiples
let supabaseInstance = null;

function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'TimeClockAppAuth',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    console.log('Supabase client initialized once'); // Debug single init
  } else {
    console.log('Reusing existing Supabase client'); // Debug reuse
  }
  return supabaseInstance;
}

export const supabase = getSupabase();

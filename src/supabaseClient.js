// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bmvjydqmxzhzusmeaajn.supabase.co'; // Replace with your Supabase URL
const supabaseAnonKey = 'your-anon-key-here'; // Replace with your anon key from Supabase

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

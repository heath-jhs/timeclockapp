import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bmvjydqmxzhzusmeaajn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtdmp5ZHFteHpoenVzbWVhYWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5OTk3MTksImV4cCI6MjA3NzU3NTcxOX0.q-CT5o_HvWKMP2XP4pmFpITcy5I6ug7KzRbTlw3fOFE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

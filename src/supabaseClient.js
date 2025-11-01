// src/supabaseClient.js
// Mock Supabase client — removes runtime errors until you add real keys

const mockSupabase = {
  from: () => ({
    select: () => ({
      order: () => ({
        then: (cb) => cb({ data: [], error: null })
      })
    })
  })
};

export const supabase = mockSupabase;

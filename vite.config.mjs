// vite.config.js (full file example)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,  // Enables source maps in production for debugging the minified bundle
  },
  // Add other configs if needed, e.g., for Supabase integration
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No hardcoded remote URLs — see build spec §9 (local deployment seam).
// `base` defaults to '/' for local dev/preview; the GitHub Pages workflow sets
// PAGES_BASE to '/<repo>/' so built asset URLs resolve under the project site.
const rawBase = process.env.PAGES_BASE || '/';
const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
  },
});

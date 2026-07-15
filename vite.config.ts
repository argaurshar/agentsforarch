import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No hardcoded remote URLs — see build spec §9 (local deployment seam).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});

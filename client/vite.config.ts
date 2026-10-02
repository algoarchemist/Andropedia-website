import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In dev the API runs on :4000. Proxying keeps the client same-origin, so no CORS or base URL is needed locally.
const proxy = {
  '/api': 'http://localhost:4000',
  '/uploads': 'http://localhost:4000',
};

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
});

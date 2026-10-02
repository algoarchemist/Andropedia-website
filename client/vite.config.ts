import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In dev the API runs on :4000. Proxying keeps the client same-origin, so no CORS or base URL is needed locally.
const proxy = {
  '/api': 'http://localhost:4000',
  '/uploads': 'http://localhost:4000',
};

// Bind IPv4 explicitly: on this Node, "localhost" resolves to ::1 only, and browsers that reach localhost
// over 127.0.0.1 could not connect. Every browser falls back to 127.0.0.1 for localhost.
const host = '127.0.0.1';

export default defineConfig({
  plugins: [react()],
  server: { host, proxy },
  preview: { host, proxy },
});

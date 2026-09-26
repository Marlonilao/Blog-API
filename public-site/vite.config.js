import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // A fixed port, so it always matches the address the API allows (CORS).
  server: { port: 5173, strictPort: true },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Für GitHub Pages: VITE_BASE_URL=/Sharing-app/ setzen
  base: process.env.VITE_BASE_URL ?? '/',
});

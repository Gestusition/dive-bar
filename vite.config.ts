import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// Relative base so the build works on any GitHub Pages repository path.
export default defineConfig({
  base: './',
  plugins: [react(), tailwind()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { host: true },
});

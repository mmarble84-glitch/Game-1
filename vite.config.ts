import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Vite config for ORBIS. The app is a static SPA; no server-side anything.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Mirror the "@/*" path alias declared in tsconfig.json.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    // Force a SINGLE three.js instance. react-globe.gl (via globe.gl) bundles its
    // own three; without deduping we get two copies and raycasting/render errors
    // (e.g. "matrixWorld.determinantAffine is not a function").
    dedupe: ['three'],
  },
  server: {
    host: true,
    port: 5173,
  },
});

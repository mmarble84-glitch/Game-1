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
  build: {
    // The globe stack (three + globe.gl) is large but stable; split it into its
    // own vendor chunk so app-code changes don't bust its long-lived cache.
    chunkSizeWarningLimit: 2600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Only peel off the large, stable globe stack; let Rollup handle the
          // rest (splitting react/framer too caused a circular vendor chunk).
          if (id.includes('node_modules') && /[\\/](three|globe\.gl|react-globe\.gl)[\\/]/.test(id)) {
            return 'globe-vendor';
          }
        },
      },
    },
  },
});

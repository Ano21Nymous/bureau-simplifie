import { defineConfig } from "vite";

// Configuration volontairement minimale : pas de framework, pas de plugin lourd.
// Objectif : bundle le plus petit et démarrage le plus rapide possible.
export default defineConfig({
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: false,
  },
  build: {
    target: "es2021",
    minify: "esbuild",
    cssMinify: true,
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 600,
  },
});

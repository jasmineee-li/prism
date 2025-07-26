import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    cors: true,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    target: "es2022", // Support for top-level await
  },
  esbuild: {
    target: "es2022", // Ensure esbuild also targets es2022
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Fix for PDF.js worker
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["pdfjs-dist"],
    esbuildOptions: {
      target: "es2022", // Also apply to dependencies
    },
  },
}));

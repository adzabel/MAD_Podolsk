import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: "frontend",
  resolve: {
    alias: {
      "@": resolve(__dirname, "frontend/src"),
      "@js": resolve(__dirname, "frontend/src/js"),
      "@styles": resolve(__dirname, "frontend/src/styles"),
      "@api": resolve(__dirname, "frontend/src/js"),
      "@ui": resolve(__dirname, "frontend/src/js/ui"),
      "@shared": resolve(__dirname, "frontend/src/js"),
      "@config": resolve(__dirname, "frontend/src/js"),
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "frontend/index.html"),
    },
  }
});

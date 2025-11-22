const { defineConfig } = require('vite');

module.exports = defineConfig({
  root: 'docs',
  base: './',
  build: {
    // build into repo root /dist
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'docs/index.html'
    }
  },
  server: {
    port: 5173
  }
});

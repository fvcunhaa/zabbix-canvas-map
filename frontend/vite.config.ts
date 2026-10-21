import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    outDir: '../module/assets',
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: 'src/main.tsx',
      output: {
        entryFileNames: 'js/canvas-app.js',
        assetFileNames: 'css/canvas-app.[ext]'
      }
    }
  }
});
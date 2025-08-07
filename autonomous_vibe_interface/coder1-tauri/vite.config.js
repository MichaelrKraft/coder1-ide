import { defineConfig } from 'vite'

export default defineConfig({
  // Tauri expects the app to be served at the root
  base: './',
  
  // Build configuration
  build: {
    // Output to current directory for Tauri
    outDir: './',
    emptyOutDir: false,
    // Generate index.html
    rollupOptions: {
      input: {
        main: 'terminal-fixed.html'
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  
  // Dev server configuration
  server: {
    port: 10001,
    strictPort: true,
    host: true
  }
})
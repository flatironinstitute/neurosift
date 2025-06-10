import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Allow external connections
    port: 5173, // Explicit port
    hmr: {
      overlay: true, // Show errors in overlay
    },
    watch: {
      usePolling: true, // Use polling for file watching (helps with some file systems)
      interval: 1000, // Poll every second
    }
  },
  resolve: {
    alias: {
      '@css': path.resolve(__dirname, './src/css'),
      '@components': path.resolve(__dirname, './src/components'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@remote-h5-file': path.resolve(__dirname, './src/remote-h5-file'),
      '@hdf5Interface': path.resolve(__dirname, './src/pages/NwbPage/hdf5Interface'),
      "@jobManager": path.resolve(__dirname, "./src/jobManager")
    }
  }
})

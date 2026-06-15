import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Dev server runs on 3000 (already in the view-nwb file server's CORS
  // allowlist) so a local dev build can read locally served NWB files.
  // strictPort: fail loudly instead of sliding to a non-allowlisted port.
  server: { port: 3000, strictPort: true },
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

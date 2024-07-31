import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'react-fsm',
      filename: 'remoteEntry.js',
      exposes: {
        react_fsm: './src/module'
      },
      shared: ['react'],
    })
  ],
  server: {
    port: 3001,
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
  }
})

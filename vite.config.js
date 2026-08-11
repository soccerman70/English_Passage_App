import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { claudeBridge } from './server/claudeBridge.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), claudeBridge()],
  server: {
    port: 5180,
    strictPort: false,
  },
  optimizeDeps: {
    // pdfjs-dist 는 자체 워커를 별도로 로드한다
    exclude: ['pdfjs-dist'],
  },
})

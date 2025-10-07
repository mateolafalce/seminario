import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 8080,
    host: true,
    allowedHosts: ['boulevard81.sixtor.site'],   
  },
})

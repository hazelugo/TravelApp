import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // CDN app lives at index.html (Vercel production).
  // Vite app entry is vite-entry.html — run `npm run dev` then open /vite-entry.html
  build: {
    rollupOptions: {
      input: 'vite-entry.html',
    },
  },
})

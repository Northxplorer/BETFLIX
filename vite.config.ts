import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // NOT "dist": PyInstaller writes the .exe into dist/, which used to wipe or
    // mix with the frontend build. run_dashboard.py serves this folder.
    outDir: 'web',
    emptyOutDir: true,
  },
})

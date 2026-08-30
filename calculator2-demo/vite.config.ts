import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/assets/calculator2/',
  plugins: [react()],
  server: {
    port: 5173
  },
  build: {
    outDir: '../public/assets/calculator2',
    // Never wipe the old hashed bundle on rebuild: GitHub Pages caches
    // calculator.html with the old SRC hash for a window we don't control, and
    // deleting the file it points at 404s the calculator silently for those
    // users (red-team 2026-08-30). Old hashes are pruned manually once a
    // deploy has aged past any plausible cache TTL.
    emptyOutDir: false
  }
})

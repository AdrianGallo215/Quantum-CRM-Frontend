import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Se excluye lo que no contiene lógica verificable: tipos (solo
      // declaraciones), el arranque de la app y el propio andamiaje de test.
      exclude: ['src/types/**', 'src/main.tsx', 'src/test/**', '**/*.config.*'],
    },
  },
})

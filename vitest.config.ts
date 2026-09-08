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
    // Auditoría T8.1 (C2): los tests de página encadenan varias queries de
    // TanStack Query (oportunidad → ítem → cronograma) y algunos rozan los
    // 10s incluso en verde — el default de 5s los hace flaky según la carga
    // de la máquina. Sin este margen, `247 passed` no era reproducible.
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Se excluye lo que no contiene lógica verificable: tipos (solo
      // declaraciones), el arranque de la app y el propio andamiaje de test.
      exclude: ['src/types/**', 'src/main.tsx', 'src/test/**', '**/*.config.*'],
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    // Sin sourcemaps en el bundle público: exponen el código fuente completo.
    // Si algún día se integra Sentry, generarlos y subirlos allí sin publicarlos.
    sourcemap: false,
    rollupOptions: {
      output: {
        /**
         * Las dependencias se separan de nuestro código porque cambian a ritmos
         * muy distintos. Todo en un solo chunk, cada despliegue invalidaba ~1 MB
         * de caché aunque solo se hubiera tocado una línea de una pantalla;
         * separadas, el navegador reutiliza React y Ant Design entre despliegues.
         *
         * Ant Design NO se agrupa a propósito: forzarlo a un chunk propio lo mete
         * entero en la carga inicial (1,2 MB) y deshace el troceado que Rollup ya
         * hace solo — así, piezas pesadas como Table viajan con las pantallas que
         * de verdad las usan.
         */
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-datos': ['@tanstack/react-query', 'axios', 'zustand', 'dayjs'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
  },
})

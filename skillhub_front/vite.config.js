import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// En dev, /api et /storage sont redirigés vers le backend (ex. Laravel sur :8000)
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text', 'html'],
      reportsDirectory: './coverage',
      // Exclure les fichiers non testables
      exclude: [
        'node_modules/**',
        'dist/**',
        'src/main.jsx',
        'src/assets/**',
        '**/*.config.*',
        'src/test/**',
        'src/**/*.jsx',     // Composants React (UI) — testés en intégration, pas en unitaire
        'src/**/*.css',     // Fichiers de style, pas de logique à couvrir
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/storage': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})

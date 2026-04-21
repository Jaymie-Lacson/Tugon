import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// Enable bundle analyzer by running: ANALYZE=true npm run build
const shouldAnalyze = process.env.ANALYZE === 'true'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    // NOTE: @vitejs/plugin-legacy was removed to eliminate ~634KB of redundant
    // polyfill bundles. Target audience uses modern browsers (Chrome 80+,
    // Safari 14+, Firefox 78+) that support all ES2020+ features natively.
    shouldAnalyze &&
      visualizer({
        filename: 'dist/bundle-stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: 'localhost',
    // Prefer user-specified port; default to 4173 since some Windows setups block 5173/5174.
    port: Number(process.env.VITE_PORT ?? 4173),
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },

  build: {
    // Target modern browsers only — matches the audience (Chrome 80+, Safari 14+,
    // Firefox 78+) and produces smaller output without ES5 transforms.
    target: 'es2020',
    // Use Lightning CSS for faster, smaller CSS output than the default postcss path.
    cssMinify: 'lightningcss',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('/leaflet/') || id.includes('\\leaflet\\') || id.includes('/react-leaflet/') || id.includes('\\react-leaflet\\')) {
            return 'vendor-leaflet'
          }

          if (id.includes('/react-router/') || id.includes('\\react-router\\')) {
            return 'vendor-router'
          }

          if (id.includes('/react/') || id.includes('\\react\\') || id.includes('/react-dom/') || id.includes('\\react-dom\\')) {
            return 'vendor-react'
          }

          return undefined
        },
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globals: true,
  },
})

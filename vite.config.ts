import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import fs from 'fs'

// Enable bundle analyzer by running: ANALYZE=true npm run build
const shouldAnalyze = process.env.ANALYZE === 'true'

function asyncCssPlugin() {
  return {
    name: 'async-css',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist')
      const htmlPath = path.join(distDir, 'index.html')
      let html = fs.readFileSync(htmlPath, 'utf-8')

      // Find ALL stylesheet link tags Vite injected
      const linkRegex = /<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/g
      let match
      const replacements: Array<{ original: string; cssFile: string }> = []

      while ((match = linkRegex.exec(html)) !== null) {
        replacements.push({ original: match[0], cssFile: match[1] })
      }

      // Convert each to: preload + async swap + noscript fallback
      for (const { original, cssFile } of replacements) {
        const preload = `<link rel="preload" href="${cssFile}" as="style">`
        const asyncLink = `<link rel="stylesheet" href="${cssFile}" media="print" onload="this.onload=null;this.media='all'">`
        const fallback = `<noscript><link rel="stylesheet" href="${cssFile}"></noscript>`
        html = html.replace(original, `${preload}${asyncLink}${fallback}`)
      }

      fs.writeFileSync(htmlPath, html)
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    asyncCssPlugin(),
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
    // Disable CSS code splitting to consolidate all CSS into a single file
    // that can be easily deferred. Code-split CSS causes render-blocking when
    // loaded dynamically by JS chunks.
    cssCodeSplit: false,
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

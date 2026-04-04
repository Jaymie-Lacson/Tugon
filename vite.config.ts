import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    legacy({
      // Keep support broad while excluding obsolete IE11.
      targets: ['defaults', 'not IE 11'],
    }),
  ],
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

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globals: true,
  },
})

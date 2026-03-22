import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

const apiProxyTarget =
  process.env.E2E_API_PROXY_TARGET ||
  process.env.VITE_API_PROXY_TARGET ||
  'http://127.0.0.1:28080'

const apiProxy = {
  '/api/lead-mentor/login': {
    target: apiProxyTarget,
    changeOrigin: true,
    rewrite: () => '/lead-mentor/login',
  },
  '/api/lead-mentor/getInfo': {
    target: apiProxyTarget,
    changeOrigin: true,
    rewrite: () => '/lead-mentor/getInfo',
  },
  '/api': {
    target: apiProxyTarget,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ''),
  },
}

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@osg/shared': resolve(__dirname, '../shared/src'),
      '@osg/shared/styles': resolve(__dirname, '../shared/src/styles/index.scss'),
      '@osg/shared/components': resolve(__dirname, '../shared/src/components'),
      '@osg/shared/utils': resolve(__dirname, '../shared/src/utils'),
      '@osg/shared/api': resolve(__dirname, '../shared/src/api'),
      '@osg/shared/types': resolve(__dirname, '../shared/src/types')
    }
  },
  server: {
    port: 3003,
    host: '0.0.0.0',
    proxy: apiProxy,
  },
  preview: {
    port: 4174,
    host: '0.0.0.0',
    proxy: apiProxy,
  },
  build: { outDir: 'dist', sourcemap: false }
})

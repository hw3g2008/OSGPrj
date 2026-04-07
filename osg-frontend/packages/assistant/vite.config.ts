import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { createApiProxyConfig } from '../../config/viteProxy'

const apiProxy = createApiProxyConfig({
  authNamespace: 'assistant',
  passthroughPrefixes: ['/api/mentor', '/assistant'],
})

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
    port: 3004,
    host: '0.0.0.0',
    proxy: apiProxy,
  },
  preview: {
    port: 4176,
    host: '0.0.0.0',
    proxy: apiProxy,
  },
  build: { outDir: 'dist', sourcemap: false }
})

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@osg/shared': resolve(__dirname, '../shared/src'),
      '@osg/shared/utils': resolve(__dirname, '../shared/src/utils'),
      '@osg/shared/utils/request': resolve(__dirname, '../shared/src/utils/request'),
      '@osg/shared/api': resolve(__dirname, '../shared/src/api'),
      '@osg/shared/api/auth': resolve(__dirname, '../shared/src/api/auth'),
      '@osg/shared/types': resolve(__dirname, '../shared/src/types'),
      '@osg/shared/components': resolve(__dirname, '../shared/src/components'),
      '@osg/shared/styles': resolve(__dirname, '../shared/src/styles/index.scss')
    }
  }
})

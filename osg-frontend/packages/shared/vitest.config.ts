import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
  resolve: {
    alias: {
      // shared 包内部用相对路径 import；这里仅为兼容外部样式注入与可能的二级别名引用
      '@osg/shared': resolve(__dirname, 'src'),
      '@osg/shared/utils': resolve(__dirname, 'src/utils'),
      '@osg/shared/utils/request': resolve(__dirname, 'src/utils/request'),
      '@osg/shared/api': resolve(__dirname, 'src/api'),
      '@osg/shared/types': resolve(__dirname, 'src/types'),
      '@osg/shared/components': resolve(__dirname, 'src/components'),
      '@osg/shared/styles': resolve(__dirname, 'src/styles/index.scss'),
    },
  },
})

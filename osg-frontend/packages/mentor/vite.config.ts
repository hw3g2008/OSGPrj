import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

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
    port: 3002,
    host: '0.0.0.0',
    proxy: {
      '/api/mentor/login': {
        target: 'http://localhost:28080',
        changeOrigin: true,
        rewrite: () => '/mentor/login'
      },
      '/api/mentor/getInfo': {
        target: 'http://localhost:28080',
        changeOrigin: true,
        rewrite: () => '/mentor/getInfo'
      },
      '/api/mentor/forgot-password': {
        target: 'http://localhost:28080',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api/, '')
      },
      // mentor 专属 API（后端路径带 /api 前缀）
      '/api/mentor': {
        target: 'http://localhost:28080',
        changeOrigin: true
      },
      // 若依通用接口（后端路径不带 /api 前缀，但前端 http client 有 baseURL=/api）
      // 前端调用 http.post('/login') → 实际请求 /api/login → 需要 rewrite 去掉 /api
      '/api': {
        target: 'http://localhost:28080',
        changeOrigin: true,
        rewrite: (path: string) => {
          // /api/mentor/* 保持原样（已被上面的规则匹配，不会到这里）
          // /api/login → /login, /api/getInfo → /getInfo, /api/captchaImage → /captchaImage
          return path.replace(/^\/api/, '')
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})

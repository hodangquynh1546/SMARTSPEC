import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue(), vueDevTools()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0', // cho phép truy cập từ các thiết bị khác
      port: Number(env.VITE_PORT || 5174), // 5173 thuộc WorkHub khi chạy cùng máy
      strictPort: true,
      allowedHosts: ['localhost', '192.168.1.15'],
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://localhost:8000', // backend SmartSpec
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})

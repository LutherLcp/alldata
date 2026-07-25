import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@alldata/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:4000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // 生产环境关闭 sourcemap
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // 路由级代码分割 — 每个页面独立 chunk
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          antd: ['antd', '@ant-design/icons'],
          charts: [
            '@antv/g2',
            '@ant-design/charts',
            'echarts',
            'echarts-for-react',
            '@antv/x6',
            '@antv/x6-react-components',
          ],
          utils: ['lodash-es', 'dayjs', 'zod', 'clsx', 'tailwind-merge'],
          i18n: ['i18next', 'react-i18next'],
          editor: ['@monaco-editor/react'],
        },
        // 长缓存优化
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },
});

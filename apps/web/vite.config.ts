import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vite';

/**
 * Vite 配置
 * - Tailwind CSS v4：使用 @tailwindcss/vite 插件（内置 PostCSS 处理，无需额外配置）
 * - 代码分割：按业务域拆分 chunk，优化长缓存策略
 */
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Tailwind CSS v4 — 替代 postcss + tailwindcss 插件
  ],
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
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // 按业务域拆分 chunk — 最大化长缓存利用率
        manualChunks: {
          // 核心框架
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI 组件库
          'vendor-antd': ['antd', '@ant-design/icons'],
          // 常用分析图表 (ECharts)
          'vendor-echarts': ['echarts', 'echarts-for-react'],
          // 高级多维可视化 (AntV G2 / Charts)
          'vendor-antv-g2': ['@antv/g2', '@ant-design/charts'],
          // 营销工作流画布引擎 (仅营销 Flow 模块使用)
          'vendor-x6': ['@antv/x6', '@antv/x6-react-components'],
          // 状态管理 + 服务端状态
          'vendor-state': ['zustand', '@tanstack/react-query'],
          // 工具库
          'vendor-utils': ['lodash-es', 'dayjs', 'zod', 'clsx', 'tailwind-merge', 'axios'],
          // 国际化
          'vendor-i18n': ['i18next', 'react-i18next'],
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },
});

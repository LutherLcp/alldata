import App from '@/App';
import i18n from '@/lang';
import { initTracker } from '@/utils/tracker';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';
// Tailwind CSS v4 — CSS-first 配置（含设计令牌 + 全局样式）
import '@/index.css';
// Ant Design 基础样式重置（需在 index.css 后引入以避免覆盖）
import 'antd/dist/reset.css';

/**
 * TanStack Query 全局配置
 * - staleTime: 5 分钟内相同参数不重复请求（分析类数据）
 * - gcTime: 10 分钟后垃圾回收（设计文档规范）
 * - retry: 失败重试 2 次
 * - refetchOnWindowFocus: 关闭（分析类数据不需要窗口聚焦刷新）
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      gcTime: 1000 * 60 * 10, // 10 min
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// 初始化全域行为事件埋点 SDK (Dogfooding)
initTracker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#0089ff',
              borderRadius: 6,
              fontFamily:
                "'Inter', 'PingFang SC', 'Microsoft YaHei', system-ui, -apple-system, sans-serif",
            },
          }}
        >
          <I18nextProvider i18n={i18n}>
            <App />
          </I18nextProvider>
        </ConfigProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

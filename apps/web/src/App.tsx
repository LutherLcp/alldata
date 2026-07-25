/**
 * 应用路由入口
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { useAuthStore } from '@/stores/auth';
import { useEffect } from 'react';
import { Spin } from 'antd';
import { LoginPage } from '@/pages/login';
import { NotFoundPage } from '@/pages/404';
import { NoPowerPage } from '@/pages/no-power';
import DashboardPage from '@/pages/dashboard';
import DashboardDetailPage from '@/pages/dashboard/detail';
import AnalysisPage from '@/pages/analysis';
import TrackingPage from '@/pages/tracking';
import TagsPage from '@/pages/tags';
import MetricsPage from '@/pages/metrics';
import AlertsPage from '@/pages/alerts';
import SettingsPage from '@/pages/settings';
import FinancePage from '@/pages/finance';
import KocrmPage from '@/pages/kocrm';

// 路由守卫 — 需要登录
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// 路由守卫 — 已登录不能访问
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// 带 Layout 的页面容器
const DashboardLayout = () => <AppLayout><Outlet /></AppLayout>;

// 占位页面（V2+ 版本实现具体内容）
const Placeholder = ({ name }: { name: string }) => (
  <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>
    <h2>{name}</h2>
    <p>功能开发中...</p>
  </div>
);

export default function App() {
  const { loading, checkAuth } = useAuthStore();

  // 在顶层初始化 auth 状态，避免死锁
  useEffect(() => { checkAuth(); }, [checkAuth]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Routes>
      {/* 公开路由 */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/no-power" element={<NoPowerPage />} />

      {/* 受保护路由 */}
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="dashboard/:id" element={<DashboardDetailPage />} />
        <Route path="analysis/*" element={<AnalysisPage />} />
        <Route path="tracking/*" element={<TrackingPage />} />
        <Route path="users/*" element={<Placeholder name="用户分析" />} />
        <Route path="tags/*" element={<TagsPage />} />
        <Route path="metrics/*" element={<MetricsPage />} />
        <Route path="assets/*" element={<Placeholder name="数据资产" />} />
        <Route path="alerts/*" element={<AlertsPage />} />
        <Route path="settings/*" element={<SettingsPage />} />
        <Route path="kocrm/*" element={<KocrmPage />} />
        <Route path="finance/*" element={<FinancePage />} />
        <Route path="calendar" element={<Placeholder name="版本日历" />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

/**
 * 应用路由入口 — 路由级代码分割
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { useAuthStore } from '@/stores/auth';
import { useEffect, lazy, Suspense } from 'react';
import { Spin } from 'antd';
import { LoginPage } from '@/pages/login';
import { NotFoundPage } from '@/pages/404';
import { NoPowerPage } from '@/pages/no-power';

// 路由级懒加载
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const DashboardDetailPage = lazy(() => import('@/pages/dashboard/detail'));
const AnalysisPage = lazy(() => import('@/pages/analysis'));
const TrackingPage = lazy(() => import('@/pages/tracking'));
const TagsPage = lazy(() => import('@/pages/tags'));
const MetricsPage = lazy(() => import('@/pages/metrics'));
const AlertsPage = lazy(() => import('@/pages/alerts'));
const SettingsPage = lazy(() => import('@/pages/settings'));
const FinancePage = lazy(() => import('@/pages/finance'));
const KocrmPage = lazy(() => import('@/pages/kocrm'));
const UsersPage = lazy(() => import('@/pages/users'));
const AssetsPage = lazy(() => import('@/pages/assets'));
const CalendarPage = lazy(() => import('@/pages/calendar'));
const AIAssistantPage = lazy(() => import('@/pages/ai-assistant'));
const ExportsPage = lazy(() => import('@/pages/download-management'));
const NotificationPage = lazy(() => import('@/pages/notification'));
const User360ProfilePage = lazy(() => import('@/pages/cdp/profile'));
const CustomerJourneyPage = lazy(() => import('@/pages/cdp/journey'));
const CohortPage = lazy(() => import('@/pages/cdp/cohort'));
const MarketingFlowPage = lazy(() => import('@/pages/marketing/flow'));
const ABTestPage = lazy(() => import('@/pages/abtest'));
const ExperiencePage = lazy(() => import('@/pages/experience'));
const MTADashboard = lazy(() => import('@/pages/mta'));
const SecurityCenterPage = lazy(() => import('@/pages/security'));

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

import { TablePageSkeleton } from '@/components/common/PageSkeleton';

// 懒加载包装器 — 使用无闪烁骨架屏
const LazyLoad = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<TablePageSkeleton />}>
    {children}
  </Suspense>
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
        <Route path="dashboard" element={<LazyLoad><DashboardPage /></LazyLoad>} />
        <Route path="dashboard/:id" element={<LazyLoad><DashboardDetailPage /></LazyLoad>} />
        <Route path="analysis/*" element={<LazyLoad><AnalysisPage /></LazyLoad>} />
        <Route path="tracking/*" element={<LazyLoad><TrackingPage /></LazyLoad>} />
        <Route path="users/*" element={<LazyLoad><UsersPage /></LazyLoad>} />
        <Route path="tags/*" element={<LazyLoad><TagsPage /></LazyLoad>} />
        <Route path="metrics/*" element={<LazyLoad><MetricsPage /></LazyLoad>} />
        <Route path="assets/*" element={<LazyLoad><AssetsPage /></LazyLoad>} />
        <Route path="alerts/*" element={<LazyLoad><AlertsPage /></LazyLoad>} />
        <Route path="settings/*" element={<LazyLoad><SettingsPage /></LazyLoad>} />
        <Route path="kocrm/*" element={<LazyLoad><KocrmPage /></LazyLoad>} />
        <Route path="finance/*" element={<LazyLoad><FinancePage /></LazyLoad>} />
        <Route path="calendar" element={<LazyLoad><CalendarPage /></LazyLoad>} />
        <Route path="ai-assistant/*" element={<LazyLoad><AIAssistantPage /></LazyLoad>} />
        <Route path="exports/*" element={<LazyLoad><ExportsPage /></LazyLoad>} />
        <Route path="notification/*" element={<LazyLoad><NotificationPage /></LazyLoad>} />
        <Route path="cdp/profile" element={<LazyLoad><User360ProfilePage /></LazyLoad>} />
        <Route path="cdp/journey" element={<LazyLoad><CustomerJourneyPage /></LazyLoad>} />
        <Route path="cdp/cohort" element={<LazyLoad><CohortPage /></LazyLoad>} />
        <Route path="marketing/flow/*" element={<LazyLoad><MarketingFlowPage /></LazyLoad>} />
        <Route path="abtest/*" element={<LazyLoad><ABTestPage /></LazyLoad>} />
        <Route path="experience/*" element={<LazyLoad><ExperiencePage /></LazyLoad>} />
        <Route path="mta/*" element={<LazyLoad><MTADashboard /></LazyLoad>} />
        <Route path="security/*" element={<LazyLoad><SecurityCenterPage /></LazyLoad>} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

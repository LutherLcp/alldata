import { Routes, Route, Navigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { Layout } from '@/components/layout';
import { useAuthStore } from '@/stores/auth';
import { useEffect } from 'react';
import { PageLoading } from '@/components/common';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, checkAuth } = useAuthStore();
  useEffect(() => { checkAuth(); }, [checkAuth]);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const DashboardLayout = () => <Layout><Outlet /></Layout>;

export default function App() {
  return (
    <PageLoading>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="analysis/*" element={<AnalysisRoutes />} />
          <Route path="dashboard/*" element={<DashboardRoutes />} />
          <Route path="users/*" element={<UserRoutes />} />
          <Route path="tracking/*" element={<TrackingRoutes />} />
          <Route path="tags/*" element={<TagRoutes />} />
          <Route path="metrics/*" element={<MetricRoutes />} />
          <Route path="assets/*" element={<AssetRoutes />} />
          <Route path="alerts/*" element={<AlertRoutes />} />
          <Route path="settings/*" element={<SettingsRoutes />} />
          <Route path="kocrm/*" element={<KoCRMRoutes />} />
          <Route path="finance/*" element={<FinanceRoutes />} />
          <Route path="calendar" element={<VersionCalendar />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </PageLoading>
  );
}

// Placeholder pages - to be implemented
const LoginPage = () => <div>Login Page</div>;
const RegisterPage = () => <div>Register Page</div>;
const Dashboard = () => <div>Dashboard</div>;
const AnalysisRoutes = () => <div>Analysis Module</div>;
const DashboardRoutes = () => <div>Dashboard Module</div>;
const UserRoutes = () => <div>User Analysis Module</div>;
const TrackingRoutes = () => <div>Tracking Management Module</div>;
const TagRoutes = () => <div>Tag Management Module</div>;
const MetricRoutes = () => <div>Metric Management Module</div>;
const AssetRoutes = () => <div>Data Asset Module</div>;
const AlertRoutes = () => <div>Alert Management Module</div>;
const SettingsRoutes = () => <div>Settings Module</div>;
const KoCRMRoutes = () => <div>KoCRM Module</div>;
const FinanceRoutes = () => <div>Finance Module</div>;
const VersionCalendar = () => <div>Version Calendar</div>;
const NotFound = () => <div>404 Not Found</div>;
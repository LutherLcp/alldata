/**
 * 全局 Layout — Header + Sider + Content
 */
import React, { useState } from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown, theme } from 'antd';
import {
  DashboardOutlined,
  LineChartOutlined,
  TagOutlined,
  FundOutlined,
  DatabaseOutlined,
  AlertOutlined,
  SettingOutlined,
  DollarOutlined,
  TeamOutlined,
  CalendarOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth';
import { useGlobalStore } from '@/stores/global';
import { ProjectSwitcher } from '@/components/common/ProjectSwitcher';

const { Header, Sider, Content } = AntLayout;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, labelKey: 'layout.dashboard' },
  { key: '/analysis', icon: <LineChartOutlined />, labelKey: 'layout.analysis' },
  { key: '/tracking', icon: <TagOutlined />, labelKey: 'layout.tracking' },
  { key: '/users', icon: <UserOutlined />, labelKey: 'layout.users' },
  { key: '/tags', icon: <FundOutlined />, labelKey: 'layout.tags' },
  { key: '/metrics', icon: <LineChartOutlined />, labelKey: 'layout.metrics' },
  { key: '/assets', icon: <DatabaseOutlined />, labelKey: 'layout.assets' },
  { key: '/alerts', icon: <AlertOutlined />, labelKey: 'layout.alerts' },
  { key: '/settings', icon: <SettingOutlined />, labelKey: 'layout.settings' },
  { key: '/finance', icon: <DollarOutlined />, labelKey: 'layout.finance' },
  { key: '/kocrm', icon: <TeamOutlined />, labelKey: 'layout.kocrm' },
  { key: '/calendar', icon: <CalendarOutlined />, labelKey: 'layout.calendar' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { userInfo, logout } = useAuthStore();
  const { token } = theme.useToken();

  const handleMenuClick = (e: { key: string }) => {
    navigate(e.key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
    localStorage.setItem('lang', newLang);
  };

  const userMenuItems = [
    { key: 'logout', icon: <LogoutOutlined />, label: t('auth.logout'), onClick: handleLogout },
  ];

  // 当前选中的菜单项
  const selectedKey = '/' + location.pathname.split('/').filter(Boolean)[0];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        style={{ borderRight: `1px solid ${token.colorBorderSecondary}` }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: collapsed ? 16 : 20 }}>
          {collapsed ? 'AD' : 'AllData'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: t(item.labelKey),
          }))}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <AntLayout>
        <Header style={{
          padding: '0 24px',
          background: token.colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              onClick: () => setCollapsed(!collapsed),
              style: { fontSize: 18, cursor: 'pointer' },
            })}
            <ProjectSwitcher />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <GlobalOutlined onClick={toggleLanguage} style={{ cursor: 'pointer', fontSize: 16 }} />
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar size="small" icon={<UserOutlined />} />
                <span>{userInfo?.username ?? 'User'}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: 16, padding: 24, background: token.colorBgContainer, borderRadius: token.borderRadiusLG, overflow: 'auto' }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
}

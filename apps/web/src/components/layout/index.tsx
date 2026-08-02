/**
 * 全局 Layout — Header + Sider + 二级功能聚合 Menu + Content
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
  DownloadOutlined,
  BellOutlined,
  NodeIndexOutlined,
  IdcardOutlined,
  PartitionOutlined,
  ExperimentOutlined,
  RobotOutlined,
  RocketOutlined,
  AimOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth';
import { ProjectSwitcher } from '@/components/common/ProjectSwitcher';

const { Header, Sider, Content } = AntLayout;

/**
 * 2级功能聚合菜单定义
 */
const rawMenuItems = [
  {
    key: 'grp_analytics',
    icon: <LineChartOutlined />,
    label: '分析与概览',
    children: [
      { key: '/dashboard', icon: <DashboardOutlined />, labelKey: 'layout.dashboard' },
      { key: '/analysis', icon: <LineChartOutlined />, labelKey: 'layout.analysis' },
      { key: '/metrics', icon: <LineChartOutlined />, labelKey: 'layout.metrics' },
    ],
  },
  {
    key: 'grp_cdp',
    icon: <IdcardOutlined />,
    label: 'CDP 画像与旅程',
    children: [
      { key: '/cdp/profile', icon: <IdcardOutlined />, label: '360° 全景画像' },
      { key: '/cdp/journey', icon: <NodeIndexOutlined />, label: '客户旅程路径' },
      { key: '/cdp/cohort', icon: <TeamOutlined />, label: '动态人群分群' },
      { key: '/tags', icon: <FundOutlined />, labelKey: 'layout.tags' },
      { key: '/users', icon: <UserOutlined />, labelKey: 'layout.users' },
    ],
  },
  {
    key: 'grp_growth',
    icon: <RocketOutlined />,
    label: '自动化与增长实验',
    children: [
      { key: '/marketing/flow', icon: <PartitionOutlined />, label: '营销自动化 Flow' },
      { key: '/abtest', icon: <ExperimentOutlined />, label: 'A/B 实验与灰度' },
      { key: '/experience', icon: <RobotOutlined />, label: 'AI Copilot 与录屏' },
      { key: '/mta', icon: <AimOutlined />, label: '全渠道多触点归因 (MTA)' },
    ],
  },
  {
    key: 'grp_tracking',
    icon: <DatabaseOutlined />,
    label: '全域埋点与数据资产',
    children: [
      { key: '/tracking', icon: <TagOutlined />, labelKey: 'layout.tracking' },
      { key: '/assets', icon: <DatabaseOutlined />, labelKey: 'layout.assets' },
    ],
  },
  {
    key: 'grp_hub',
    icon: <BellOutlined />,
    label: '预警通知与导出 Hub',
    children: [
      { key: '/alerts', icon: <AlertOutlined />, labelKey: 'layout.alerts' },
      { key: '/exports', icon: <DownloadOutlined />, labelKey: 'layout.exports' },
      { key: '/notification', icon: <BellOutlined />, labelKey: 'layout.notification' },
      { key: '/calendar', icon: <CalendarOutlined />, labelKey: 'layout.calendar' },
    ],
  },
  {
    key: 'grp_system',
    icon: <SettingOutlined />,
    label: '私域 CRM 与系统管理',
    children: [
      { key: '/kocrm', icon: <TeamOutlined />, labelKey: 'layout.kocrm' },
      { key: '/finance', icon: <DollarOutlined />, labelKey: 'layout.finance' },
      { key: '/settings', icon: <SettingOutlined />, labelKey: 'layout.settings' },
    ],
  },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { userInfo, logout } = useAuthStore();
  const { token } = theme.useToken();

  const handleMenuClick = (e: { key: string }) => {
    if (e.key && !e.key.startsWith('grp_')) {
      navigate(e.key);
    }
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

  // 计算当前精准命中的子路由 key
  const fullPath = location.pathname;
  let selectedKey = fullPath;
  if (fullPath.startsWith('/cdp/profile')) selectedKey = '/cdp/profile';
  else if (fullPath.startsWith('/cdp/journey')) selectedKey = '/cdp/journey';
  else if (fullPath.startsWith('/cdp/cohort')) selectedKey = '/cdp/cohort';
  else if (fullPath.startsWith('/marketing/flow')) selectedKey = '/marketing/flow';
  else if (fullPath.startsWith('/abtest')) selectedKey = '/abtest';
  else if (fullPath.startsWith('/experience')) selectedKey = '/experience';
  else {
    const firstSegment = '/' + fullPath.split('/').filter(Boolean)[0];
    if (firstSegment) selectedKey = firstSegment;
  }

  // 展开父级分组
  const parentGroup = rawMenuItems.find((grp) =>
    grp.children?.some((child) => child.key === selectedKey)
  );
  const [openKeys, setOpenKeys] = useState<string[]>(parentGroup ? [parentGroup.key] : ['grp_analytics']);

  // 递归解析 i18n 文本
  const formattedItems = rawMenuItems.map((grp) => ({
    key: grp.key,
    icon: grp.icon,
    label: grp.label || ((grp as any).labelKey ? t((grp as any).labelKey) : ''),
    children: grp.children?.map((child) => ({
      key: child.key,
      icon: child.icon,
      label: child.label || ((child as any).labelKey ? t((child as any).labelKey) : ''),
    })),
  }));

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        width={230}
        style={{ borderRight: `1px solid ${token.colorBorderSecondary}` }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: collapsed ? 16 : 20 }}>
          {collapsed ? 'AD' : 'AllData 全域运营'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          openKeys={collapsed ? undefined : openKeys}
          onOpenChange={(keys) => setOpenKeys(keys as string[])}
          items={formattedItems}
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

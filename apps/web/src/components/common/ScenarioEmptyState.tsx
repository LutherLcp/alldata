/**
 * 业务场景化空状态引导组件 (Scenario Onboarding Empty State)
 */
import React from 'react';
import { Typography, Button, Tooltip } from 'antd';
import { PlusOutlined, RocketOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface ScenarioEmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  hasPermission?: boolean;
}

export function ScenarioEmptyState({
  title,
  description,
  actionText,
  onAction,
  icon = <RocketOutlined style={{ fontSize: 44, color: '#1890ff' }} />,
  hasPermission = true,
}: ScenarioEmptyStateProps) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      background: 'linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%)',
      borderRadius: 12,
      border: '1px dashed #d9d9d9',
      margin: '16px 0',
    }}>
      <div style={{ marginBottom: 16 }}>{icon}</div>
      <Title level={4} style={{ marginBottom: 8, color: '#1f2937' }}>{title}</Title>
      <Paragraph type="secondary" style={{ maxWidth: 460, margin: '0 auto 24px', color: '#6b7280', fontSize: 14 }}>
        {description}
      </Paragraph>
      {actionText && onAction && (
        hasPermission ? (
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={onAction}>
            {actionText}
          </Button>
        ) : (
          <Tooltip title="您当前未分配编辑权限，请联系项目管理员开通">
            <Button disabled size="large">{actionText}</Button>
          </Tooltip>
        )
      )}
    </div>
  );
}

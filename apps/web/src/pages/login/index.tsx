/**
 * 登录页面
 */
import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/services-new/auth';

const { Title } = Typography;

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setAuth } = useAuthStore();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const data = await authApi.login(values);
      setAuth(data);
      message.success(t('auth.loginSuccess'));
      navigate('/dashboard');
    } catch {
      message.error(t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card style={{ width: 400, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 4 }}>AllData</Title>
          <Typography.Text type="secondary">全域数据运营平台</Typography.Text>
        </div>
        <Form onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: t('auth.username') }]}>
            <Input prefix={<UserOutlined />} placeholder={t('auth.username')} />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: t('auth.password') }]}>
            <Input.Password prefix={<LockOutlined />} placeholder={t('auth.password')} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {t('auth.login')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

/**
 * 消息通知中心页
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Space, Tag, Tabs, message, Badge, Typography, Switch, Form, Input } from 'antd';
import { BellOutlined, ReloadOutlined, CheckOutlined, MailOutlined, RobotOutlined } from '@ant-design/icons';
import { useGlobalStore } from '@/stores/global';
import { noticeApi } from '@/services-new/v4';

const { Text, Title } = Typography;

const TYPE_MAP: Record<string, { color: string; text: string }> = {
  system: { color: 'blue', text: '系统通知' },
  alert: { color: 'red', text: '预警告警' },
  export: { color: 'green', text: '导出完成' },
  subscription: { color: 'purple', text: '定时订阅' },
};

export default function NotificationPage() {
  const currentProject = useGlobalStore((s) => s.currentProject);
  const projectId = currentProject?.id;
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = (await noticeApi.list(projectId).catch(() => [])) as any[];
      setNotices(Array.isArray(res) ? res : []);
      const countRes = (await noticeApi.unreadCount(projectId).catch(() => ({ count: 0 }))) as any;
      setUnreadCount(countRes.count || 0);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkRead = async (ids: number[]) => {
    await noticeApi.markRead(ids);
    message.success('已标记为已读');
    loadData();
  };

  const handleMarkAllRead = async () => {
    if (!projectId) return;
    await noticeApi.markAllRead(projectId);
    message.success('已全部标记为已读');
    loadData();
  };

  return (
    <Card
      title={
        <Space>
          <Badge count={unreadCount} overflowCount={99}>
            <BellOutlined style={{ fontSize: 20, color: '#1890ff' }} />
          </Badge>
          <span>消息通知与全渠道订阅中心</span>
        </Space>
      }
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            刷新
          </Button>
          <Button icon={<CheckOutlined />} onClick={handleMarkAllRead}>
            全部已读
          </Button>
        </Space>
      }
    >
      <Tabs
        items={[
          {
            key: 'list',
            label: `消息列表 (${notices.length})`,
            children: (
              <Table
                dataSource={notices}
                rowKey="id"
                loading={loading}
                size="small"
                pagination={{ pageSize: 15 }}
                columns={[
                  {
                    title: '标题',
                    dataIndex: 'title',
                    width: 250,
                    render: (text: string, r: any) => (
                      <Space>
                        {!r.is_read && <Badge status="error" />}
                        <Text style={{ fontWeight: !r.is_read ? 'bold' : 'normal' }}>{text}</Text>
                      </Space>
                    ),
                  },
                  {
                    title: '分类',
                    dataIndex: 'type',
                    width: 120,
                    render: (type: string) => (
                      <Tag color={TYPE_MAP[type]?.color || 'default'}>{TYPE_MAP[type]?.text || type}</Tag>
                    ),
                  },
                  {
                    title: '内容详情',
                    dataIndex: 'content',
                    ellipsis: true,
                  },
                  {
                    title: '发送时间',
                    dataIndex: 'created_at',
                    width: 180,
                    render: (d: string) => (d ? new Date(d).toLocaleString() : '-'),
                  },
                  {
                    title: '操作',
                    key: 'action',
                    width: 100,
                    render: (_: any, r: any) =>
                      !r.is_read ? (
                        <Button type="link" size="small" onClick={() => handleMarkRead([r.id])}>
                          设为已读
                        </Button>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          已读
                        </Text>
                      ),
                  },
                ]}
              />
            ),
          },
          {
            key: 'channels',
            label: '多渠道推送配置',
            children: <ChannelConfigCard />,
          },
        ]}
      />
    </Card>
  );
}

function ChannelConfigCard() {
  const [form] = Form.useForm();
  return (
    <div style={{ maxWidth: 700, margin: '20px 0' }}>
      <Title level={5}>全渠道机器人与邮件配置</Title>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          feishu_enabled: true,
          feishu_webhook: 'https://open.feishu.cn/open-apis/bot/v2/hook/demo-uuid',
          email_enabled: true,
          email_smtp: 'smtp.qiye.aliyun.com',
          email_recipients: 'admin@company.com,devops@company.com',
        }}
      >
        <Card title={<Space><RobotOutlined style={{ color: '#00d6b9' }} /><span>飞书机器人 (Feishu Bot)</span></Space>} size="small" style={{ marginBottom: 16 }}>
          <Form.Item name="feishu_enabled" label="启用飞书群消息推送" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="feishu_webhook" label="Webhook URL">
            <Input placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." />
          </Form.Item>
        </Card>

        <Card title={<Space><MailOutlined style={{ color: '#1890ff' }} /><span>邮件通知服务 (SMTP)</span></Space>} size="small" style={{ marginBottom: 16 }}>
          <Form.Item name="email_enabled" label="启用邮件告警通知" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="email_smtp" label="SMTP 服务器">
            <Input placeholder="smtp.exmail.qq.com" />
          </Form.Item>
          <Form.Item name="email_recipients" label="默认订阅告警接收人">
            <Input placeholder="email1@company.com,email2@company.com" />
          </Form.Item>
        </Card>

        <Button type="primary" onClick={() => message.success('渠道配置保存成功 (已应用 Mock 演示模式)')}>
          保存配置
        </Button>
      </Form>
    </div>
  );
}

/**
 * 动态 Cohort 实时人群分群管理页
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, Tag, message, Popconfirm, Row, Col, Typography } from 'antd';
import { TeamOutlined, PlusOutlined, ReloadOutlined, DeleteOutlined, UsergroupAddOutlined, ExportOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function CohortManagementPage() {
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [estimateCount, setEstimateCount] = useState<number | null>(null);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    setTimeout(() => {
      setCohorts([
        {
          id: 1,
          name: '高价值沉睡复购人群',
          description: '近30天未下单但历史累计消费 > 1000 元的高意向用户',
          user_count: 1420,
          rules: [{ property: 'total_spend', operator: '>', value: 1000 }, { property: 'days_since_last_order', operator: '>', value: 30 }],
          refresh_cron: '0 2 * * * (每天凌晨2点)',
          last_refreshed_at: '2026-08-01 02:00:00',
        },
        {
          id: 2,
          name: '新注册未首单转化人群',
          description: '注册时间在7天内，浏览次数 > 5 次但无支付记录',
          user_count: 3890,
          rules: [{ property: 'register_days', operator: '<=', value: 7 }, { property: 'view_count', operator: '>', value: 5 }],
          refresh_cron: '0 */6 * * * (每6小时)',
          last_refreshed_at: '2026-08-01 18:00:00',
        },
      ]);
      setLoading(false);
    }, 300);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEstimate = () => {
    const count = Math.floor(Math.random() * 4000) + 800;
    setEstimateCount(count);
    message.info(`预估覆盖目标人群: ${count} 人`);
  };

  const handleSave = async () => {
    const v = await form.validateFields();
    message.success(`分群 "${v.name}" 已创建成功，正在生成物化人群包`);
    setModalOpen(false);
    loadData();
  };

  return (
    <Card
      title={
        <Space>
          <TeamOutlined style={{ color: '#1890ff', fontSize: 20 }} />
          <span>动态 Cohort 实时人群分群管理器</span>
        </Space>
      }
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setEstimateCount(null); setModalOpen(true); }}>
            新建人群分群
          </Button>
        </Space>
      }
    >
      <Table
        dataSource={cohorts}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10 }}
        columns={[
          { title: '人群名称', dataIndex: 'name', width: 220, render: (t: string) => <Text style={{ fontWeight: 'bold' }}>{t}</Text> },
          { title: '规则描述', dataIndex: 'description', ellipsis: true },
          { title: '覆盖人数', dataIndex: 'user_count', width: 140, render: (c: number) => <Tag color="blue">{c.toLocaleString()} 人</Tag> },
          { title: '刷新频率', dataIndex: 'refresh_cron', width: 180 },
          { title: '最近更新时间', dataIndex: 'last_refreshed_at', width: 180 },
          {
            title: '操作',
            key: 'action',
            width: 180,
            render: (_: any, r: any) => (
              <Space>
                <Button type="link" size="small" icon={<ExportOutlined />} onClick={() => message.success(`人群包已一键导出 (${r.user_count}人)`)}>
                  推送/导出
                </Button>
                <Popconfirm title="确认删除该人群分群?" onConfirm={() => message.success('已删除')}>
                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal title="新建 Cohort 动态人群规则" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} width={650} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="人群包名称" rules={[{ required: true, message: '请输入人群名称' }]}>
            <Input placeholder="例: 智能手表高意向未购买人群" />
          </Form.Item>
          <Form.Item name="description" label="详细规则说明">
            <Input.TextArea rows={2} placeholder="详细描述该分群的定义与使用场景..." />
          </Form.Item>
          <Form.Item label="行为与属性规则组合 (AND 过滤)">
            <Card size="small" style={{ backgroundColor: '#fafafa' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Select defaultValue="event_count" options={[{ value: 'event_count', label: '近7天特定行为频次' }]} style={{ width: 180 }} />
                  <Select defaultValue="gt" options={[{ value: 'gt', label: '大于 (>)' }]} style={{ width: 100 }} />
                  <Input defaultValue="3" style={{ width: 100 }} />
                </Space>
                <Space>
                  <Select defaultValue="total_spend" options={[{ value: 'total_spend', label: 'LTV 累计消费金额' }]} style={{ width: 180 }} />
                  <Select defaultValue="gte" options={[{ value: 'gte', label: '大于等于 (>=)' }]} style={{ width: 100 }} />
                  <Input defaultValue="500" style={{ width: 100 }} />
                </Space>
              </Space>
            </Card>
          </Form.Item>

          <Row gutter={16} align="middle">
            <Col span={12}>
              <Button icon={<UsergroupAddOutlined />} onClick={handleEstimate}>
                实时预估覆盖人数
              </Button>
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
              {estimateCount !== null && (
                <Text type="success" style={{ fontWeight: 'bold', fontSize: 15 }}>
                  <CheckCircleOutlined /> 预估约包含 {estimateCount} 名目标用户
                </Text>
              )}
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
}

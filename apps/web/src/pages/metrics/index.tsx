import { metricApi } from '@/services/metric';
import { useGlobalStore } from '@/stores/global';
import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Tag, message } from 'antd';
/**
 * 指标管理页
 */
import { useCallback, useEffect, useState } from 'react';

const { TextArea } = Input;

export default function MetricsPage() {
  const currentProject = useGlobalStore((s) => s.currentProject);
  const projectId = currentProject?.id;
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      setMetrics(((await metricApi.list(projectId).catch(() => [])) as any[]) || []);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    const v = await form.validateFields();
    const formula = v.formula ? JSON.parse(v.formula) : {};
    await metricApi.create({ project_id: projectId, ...v, formula });
    message.success('指标已创建');
    setModalOpen(false);
    loadData();
  };

  const handleSeedPresets = async () => {
    if (!projectId) return;
    try {
      await metricApi.seedPresets(projectId);
      message.success('预置标准指标已初始化');
      loadData();
    } catch {
      message.error('初始化预置指标失败');
    }
  };

  return (
    <Card
      title="指标管理与语义模型"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            刷新
          </Button>
          <Button icon={<ThunderboltOutlined />} onClick={handleSeedPresets}>
            初始化预置指标
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setModalOpen(true);
            }}
          >
            新建指标
          </Button>
        </Space>
      }
    >
      <Table
        dataSource={metrics}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 20 }}
        columns={[
          { title: '指标标识', dataIndex: 'name', width: 140 },
          {
            title: '显示名称',
            dataIndex: 'display_name',
            width: 160,
            render: (v: string) => <strong>{v || '-'}</strong>,
          },
          {
            title: '语义公式与类型',
            dataIndex: 'formula',
            width: 280,
            render: (f: any) => {
              if (!f || typeof f !== 'object') return '-';
              if (f.type === 'composite') {
                return (
                  <Space size="small">
                    <Tag color="purple">复合派生</Tag>
                    <code>{f.expression || '-'}</code>
                  </Space>
                );
              }
              return (
                <Space size="small">
                  <Tag color="blue">基础原子</Tag>
                  <span>
                    {f.agg_type || 'count'}({f.event_name || '全部事件'})
                  </span>
                </Space>
              );
            },
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 80,
            render: (s: number) => (
              <Tag color={s === 1 ? 'green' : 'default'}>{s === 1 ? '启用' : '禁用'}</Tag>
            ),
          },
          {
            title: '操作',
            key: 'action',
            width: 120,
            render: (_: any, r: any) => (
              <Popconfirm
                title="确认删除?"
                onConfirm={async () => {
                  await metricApi.delete(r.id);
                  loadData();
                }}
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            ),
          },
        ]}
      />
      <Modal
        title="新建指标"
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="指标名" rules={[{ required: true }]}>
            <Input placeholder="例: dau" />
          </Form.Item>
          <Form.Item name="display_name" label="显示名">
            <Input placeholder="例: 日活跃用户" />
          </Form.Item>
          <Form.Item name="formula" label="公式 (JSON)">
            <TextArea rows={3} placeholder='{"type":"count","event":"login"}' />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

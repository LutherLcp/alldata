/**
 * 指标管理页
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, Tag, Typography, message, Popconfirm } from 'antd';
import { PlusOutlined, ReloadOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useGlobalStore } from '@/stores/global';
import { metricApi } from '@/services-new/metric';

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
    try { setMetrics(((await metricApi.list(projectId).catch(() => [])) as any[]) || []); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    const v = await form.validateFields();
    const formula = v.formula ? JSON.parse(v.formula) : {};
    await metricApi.create({ project_id: projectId, ...v, formula });
    message.success('指标已创建');
    setModalOpen(false);
    loadData();
  };

  return (
    <Card title="指标管理" extra={<Space>
      <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>新建指标</Button>
    </Space>}>
      <Table dataSource={metrics} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }}
        columns={[
          { title: '指标名', dataIndex: 'name', width: 150 },
          { title: '显示名', dataIndex: 'display_name', width: 150, render: (v: string) => v || '-' },
          { title: '公式', dataIndex: 'formula', width: 200, render: (f: any) => <code>{JSON.stringify(f)}</code> },
          { title: '状态', dataIndex: 'status', width: 80, render: (s: number) => <Tag color={s === 1 ? 'green' : 'default'}>{s === 1 ? '启用' : '禁用'}</Tag> },
          { title: '操作', key: 'action', width: 120, render: (_: any, r: any) => (
            <Popconfirm title="确认删除?" onConfirm={async () => { await metricApi.delete(r.id); loadData(); }}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )},
        ]}
      />
      <Modal title="新建指标" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="指标名" rules={[{ required: true }]}><Input placeholder="例: dau" /></Form.Item>
          <Form.Item name="display_name" label="显示名"><Input placeholder="例: 日活跃用户" /></Form.Item>
          <Form.Item name="formula" label="公式 (JSON)"><TextArea rows={3} placeholder='{"type":"count","event":"login"}' /></Form.Item>
          <Form.Item name="description" label="描述"><TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

/**
 * 预警管理页
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, Tag, Typography, message, Popconfirm, Tabs, Descriptions, Timeline, Progress } from 'antd';
import { PlusOutlined, ReloadOutlined, DeleteOutlined, PlayCircleOutlined, AlertOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useGlobalStore } from '@/stores/global';
import { warningApi } from '@/services-new/v4';

const { TextArea } = Input;
const STATUS_MAP: Record<number, { color: string; text: string }> = { 1: { color: 'green', text: '启用' }, 2: { color: 'default', text: '禁用' } };

export default function AlertsPage() {
  const currentProject = useGlobalStore((s) => s.currentProject);
  const projectId = currentProject?.id;
  const [warnings, setWarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [current, setCurrent] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try { setWarnings(((await warningApi.list(projectId).catch(() => [])) as any[]) || []); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    const v = await form.validateFields();
    await warningApi.create({ project_id: projectId, ...v, monitor_rules: { type: v.rule_type || 'threshold', metric: v.metric || 'dau', operator: '>', value: Number(v.threshold) || 500 }, notify_config: { channels: ['email'], recipients: v.recipients || 'admin@test.com' } });
    message.success('预警规则已创建');
    setModalOpen(false);
    loadData();
  };

  const handleCheck = async (id: number) => {
    const result = await warningApi.check(id) as any;
    message.success(result.triggered ? '预警已触发!' : '检查通过，指标正常');
    loadData();
  };

  const showDetail = async (record: any) => {
    setCurrent(record);
    setDetailOpen(true);
    const logData = await warningApi.logs(record.id) as any;
    setLogs(Array.isArray(logData) ? logData : []);
  };

  return (
    <Card title="预警管理" extra={<Space>
      <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>新建规则</Button>
    </Space>}>
      <Table dataSource={warnings} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }}
        columns={[
          { title: '规则名', dataIndex: 'name', width: 200 },
          { title: '状态', dataIndex: 'status', width: 80, render: (s: number) => <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.text}</Tag> },
          { title: '触发次数', key: 'logs', width: 100, render: (_: any, r: any) => r._count?.logs || 0 },
          { title: '检查周期', dataIndex: 'check_cron', width: 120, render: (v: string) => v || '-' },
          { title: '操作', key: 'action', width: 250, render: (_: any, r: any) => (
            <Space>
              <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => handleCheck(r.id)}>检查</Button>
              <Button type="link" size="small" onClick={() => showDetail(r)}>详情</Button>
              <Popconfirm title="确认删除?" onConfirm={async () => { await warningApi.delete(r.id); loadData(); }}>
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
              </Popconfirm>
            </Space>
          )},
        ]}
      />

      <Modal title="新建预警规则" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="规则名称" rules={[{ required: true }]}><Input placeholder="例: DAU 低于阈值预警" /></Form.Item>
          <Form.Item name="rule_type" label="规则类型" initialValue="threshold"><Select options={[{ value: 'threshold', label: '阈值预警' }, { value: 'trend', label: '趋势预警' }, { value: 'ratio', label: '比率预警' }]} /></Form.Item>
          <Form.Item name="metric" label="监控指标"><Input placeholder="例: dau / revenue / conversion_rate" /></Form.Item>
          <Form.Item name="threshold" label="阈值"><Input type="number" placeholder="500" /></Form.Item>
          <Form.Item name="check_cron" label="检查周期 (Cron)"><Input placeholder="0 */5 * * * (每5小时)" /></Form.Item>
          <Form.Item name="recipients" label="通知接收人"><Input placeholder="email1@test.com,email2@test.com" /></Form.Item>
        </Form>
      </Modal>

      <Modal title={`预警详情 — ${current?.name}`} open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={700}>
        {current && (
          <Tabs items={[
            { key: 'info', label: '规则信息', children: (
              <Descriptions column={2} size="small">
                <Descriptions.Item label="状态"><Tag color={STATUS_MAP[current.status]?.color}>{STATUS_MAP[current.status]?.text}</Tag></Descriptions.Item>
                <Descriptions.Item label="检查周期">{current.check_cron || '未设置'}</Descriptions.Item>
                <Descriptions.Item label="监控规则" span={2}><code>{JSON.stringify(current.monitor_rules)}</code></Descriptions.Item>
                <Descriptions.Item label="通知配置" span={2}><code>{JSON.stringify(current.notify_config)}</code></Descriptions.Item>
              </Descriptions>
            )},
            { key: 'logs', label: `触发日志 (${logs.length})`, children: logs.length === 0 ? <div style={{ textAlign: 'center', padding: 40 }}>暂无日志</div> : (
              <Timeline items={logs.map((l: any) => ({
                color: l.status === 1 ? 'red' : 'green',
                dot: l.status === 1 ? <AlertOutlined /> : <CheckCircleOutlined />,
                children: <div><div>{l.detail?.message || (l.status === 1 ? '预警触发' : '恢复正常')}</div><div style={{ fontSize: 12, color: '#999' }}>{new Date(l.trigger_time).toLocaleString()} · 值: {l.detail?.value} · 阈值: {l.detail?.threshold}</div></div>,
              }))} />
            )},
          ]} />
        )}
      </Modal>
    </Card>
  );
}

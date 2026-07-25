/**
 * 设置管理页 — 订阅推送 + 下载任务 + 枚举配置
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, Tag, Tabs, message, Popconfirm, Progress, Tooltip } from 'antd';
import { PlusOutlined, ReloadOutlined, SendOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useGlobalStore } from '@/stores/global';
import { subscriptionApi, downloadApi, enumApi } from '@/services-new/v4';

const TASK_STATUS: Record<number, { color: string; text: string }> = { 1: { color: 'default', text: '排队' }, 2: { color: 'processing', text: '进行中' }, 3: { color: 'success', text: '完成' }, 4: { color: 'error', text: '失败' } };

export default function SettingsPage() {
  const currentProject = useGlobalStore((s) => s.currentProject);
  const projectId = currentProject?.id;

  return (
    <Tabs items={[
      { key: 'subscriptions', label: '订阅推送', children: <SubscriptionTab projectId={projectId} /> },
      { key: 'downloads', label: '下载任务', children: <DownloadTab projectId={projectId} /> },
      { key: 'enums', label: '枚举配置', children: <EnumTab projectId={projectId} /> },
    ]} />
  );
}

// ─── 订阅推送 Tab ───
function SubscriptionTab({ projectId }: { projectId?: number }) {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try { setSubs(((await subscriptionApi.list(projectId).catch(() => [])) as any[]) || []); }
    finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const v = await form.validateFields();
    await subscriptionApi.create({ project_id: projectId, ...v, entity_id: v.entity_id || 1, entity_type: v.entity_type || 'dashboard' });
    message.success('订阅已创建'); setModalOpen(false); load();
  };

  return (
    <Card size="small" extra={<Space><Button icon={<ReloadOutlined />} onClick={load}>刷新</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>新建订阅</Button></Space>}>
      <Table dataSource={subs} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }}
        columns={[
          { title: '订阅名', dataIndex: 'name', width: 200 },
          { title: '类型', dataIndex: 'entity_type', width: 100, render: (v: string) => <Tag>{v}</Tag> },
          { title: '推送方式', dataIndex: 'notify_type', width: 100 },
          { title: '周期', dataIndex: 'schedule_cron', width: 150 },
          { title: '状态', dataIndex: 'status', width: 80, render: (s: number) => <Tag color={s === 1 ? 'green' : 'default'}>{s === 1 ? '启用' : '禁用'}</Tag> },
          {
            title: '操作', key: 'action', width: 200, render: (_: any, r: any) => (
              <Space>
                <Tooltip title="立即推送"><Button type="link" size="small" icon={<SendOutlined />} onClick={async () => { const res = await subscriptionApi.send(r.id) as any; message.success(`推送成功，收件人: ${res.recipients}`); }}>推送</Button></Tooltip>
                <Popconfirm title="确认删除?" onConfirm={async () => { await subscriptionApi.delete(r.id); load(); }}><Button type="link" size="small" danger>删除</Button></Popconfirm>
              </Space>
            )
          },
        ]}
      />
      <Modal title="新建订阅" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="订阅名称" rules={[{ required: true }]}><Input placeholder="例: 每日看板摘要" /></Form.Item>
          <Form.Item name="entity_type" label="实体类型" initialValue="dashboard"><Select options={[{ value: 'dashboard', label: '看板' }, { value: 'report', label: '报表' }]} /></Form.Item>
          <Form.Item name="schedule_cron" label="推送周期 (Cron)" rules={[{ required: true }]}><Input placeholder="0 9 * * * (每天9点)" /></Form.Item>
          <Form.Item name="notify_type" label="推送方式" initialValue="email"><Select options={[{ value: 'email', label: '邮件' }, { value: 'feishu', label: '飞书' }]} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

// ─── 下载任务 Tab ───
function DownloadTab({ projectId }: { projectId?: number }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try { setTasks(((await downloadApi.list(projectId).catch(() => [])) as any[]) || []); }
    finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  return (
    <Card size="small" extra={<Space><Button icon={<ReloadOutlined />} onClick={load}>刷新</Button><Button type="primary" icon={<PlusOutlined />} onClick={async () => { await downloadApi.create({ project_id: projectId, task_name: `导出_${Date.now()}`, task_type: 'report' }); message.success('任务已创建'); load(); }}>新建任务</Button></Space>}>
      <Table dataSource={tasks} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }}
        columns={[
          { title: '任务名', dataIndex: 'task_name', width: 200 },
          { title: '类型', dataIndex: 'task_type', width: 100, render: (v: string) => <Tag>{v}</Tag> },
          { title: '状态', dataIndex: 'status', width: 120, render: (s: number, r: any) => <Space><Tag color={TASK_STATUS[s]?.color}>{TASK_STATUS[s]?.text}</Tag>{s === 2 && <Progress percent={r.progress} size="small" style={{ width: 80 }} />}</Space> },
          { title: '文件', dataIndex: 'file_url', width: 200, render: (v: string) => v ? <a href={v}>{v.split('/').pop()}</a> : '-' },
          {
            title: '操作', key: 'action', width: 200, render: (_: any, r: any) => (
              <Space>
                {r.status === 1 && <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={async () => { await downloadApi.execute(r.id); message.success('导出完成'); load(); }}>执行</Button>}
                <Popconfirm title="确认删除?" onConfirm={async () => { await downloadApi.delete(r.id); load(); }}><Button type="link" size="small" danger>删除</Button></Popconfirm>
              </Space>
            )
          },
        ]}
      />
    </Card>
  );
}

// ─── 枚举配置 Tab ───
function EnumTab({ projectId }: { projectId?: number }) {
  const [enums, setEnums] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try { setEnums(((await enumApi.list(projectId).catch(() => [])) as any[]) || []); }
    finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const v = await form.validateFields();
    const items = (v.items_text || '').split('\n').filter(Boolean).map((line: string) => {
      const [value, label] = line.split(':').map((s: string) => s.trim());
      return { value, label: label || value };
    });
    await enumApi.create({ project_id: projectId, type_key: v.type_key, name: v.name, items, description: v.description });
    message.success('枚举已创建'); setModalOpen(false); load();
  };

  return (
    <Card size="small" extra={<Space><Button icon={<ReloadOutlined />} onClick={load}>刷新</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>新建枚举</Button></Space>}>
      <Table dataSource={enums} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }}
        columns={[
          { title: '类型Key', dataIndex: 'type_key', width: 150 },
          { title: '名称', dataIndex: 'name', width: 200 },
          { title: '描述', dataIndex: 'description', width: 200, render: (v: string) => v || '-' },
          { title: '枚举项', dataIndex: 'items', width: 300, render: (items: any) => Array.isArray(items) ? items.map((i: any) => <Tag key={i.value} style={{ marginBottom: 2 }}>{i.label || i.value}</Tag>) : '-' },
          {
            title: '操作', key: 'action', width: 100, render: (_: any, r: any) => (
              <Popconfirm title="确认删除?" onConfirm={async () => { await enumApi.delete(r.id); load(); }}><Button type="link" size="small" danger>删除</Button></Popconfirm>
            )
          },
        ]}
      />
      <Modal title="新建枚举" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="type_key" label="类型Key" rules={[{ required: true }]}><Input placeholder="例: event_category" /></Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input placeholder="例: 事件分类" /></Form.Item>
          <Form.Item name="items_text" label="枚举项（每行一个，格式: value:label）"><Input.TextArea rows={4} placeholder={"click:点击\nview:浏览\nsubmit:提交"} /></Form.Item>
          <Form.Item name="description" label="描述"><Input placeholder="可选描述" /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

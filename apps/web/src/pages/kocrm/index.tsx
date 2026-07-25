/**
 * KoCRM 管理页 — 账户管理 + 达人管理
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, Tag, Tabs, message, Popconfirm, InputNumber } from 'antd';
import { PlusOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useGlobalStore } from '@/stores/global';
import { kocrmApi } from '@/services-new/v5';

export default function KocrmPage() {
  const currentProject = useGlobalStore((s) => s.currentProject);
  const projectId = currentProject?.id;

  return (
    <Tabs items={[
      { key: 'accounts', label: '账户管理', children: <AccountTab projectId={projectId} /> },
      { key: 'creators', label: '达人管理', children: <CreatorTab projectId={projectId} /> },
    ]} />
  );
}

// ─── 账户管理 Tab ───
function AccountTab({ projectId }: { projectId?: number }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try { setData(((await kocrmApi.listAccounts(projectId).catch(() => [])) as any[]) || []); }
    finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const v = await form.validateFields();
    await kocrmApi.createAccount({ project_id: projectId, ...v });
    message.success('账户已创建'); setModalOpen(false); load();
  };

  return (
    <Card size="small" extra={<Space>
      <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>新建账户</Button>
    </Space>}>
      <Table dataSource={data} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }}
        columns={[
          { title: '平台', dataIndex: 'platform', width: 100, render: (v: string) => <Tag color="blue">{v}</Tag> },
          { title: '账户名称', dataIndex: 'account_name', width: 200 },
          { title: '账户ID', dataIndex: 'account_id', width: 150 },
          { title: '状态', dataIndex: 'status', width: 80, render: (s: number) => <Tag color={s === 1 ? 'green' : 'default'}>{s === 1 ? '正常' : '禁用'}</Tag> },
          { title: '操作', key: 'action', width: 100, render: (_: any, r: any) => (
            <Popconfirm title="确认删除?" onConfirm={async () => { await kocrmApi.deleteAccount(r.id); load(); }}>
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          )},
        ]}
      />
      <Modal title="新建账户" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="platform" label="平台" rules={[{ required: true }]}><Select options={[{ value: '抖音', label: '抖音' }, { value: '快手', label: '快手' }, { value: '小红书', label: '小红书' }, { value: 'B站', label: 'B站' }, { value: '微博', label: '微博' }]} /></Form.Item>
          <Form.Item name="account_name" label="账户名称" rules={[{ required: true }]}><Input placeholder="例: 官方账号" /></Form.Item>
          <Form.Item name="account_id" label="账户ID" rules={[{ required: true }]}><Input placeholder="平台账户ID" /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

// ─── 达人管理 Tab ───
function CreatorTab({ projectId }: { projectId?: number }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try { setData(((await kocrmApi.listCreators(projectId).catch(() => [])) as any[]) || []); }
    finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const v = await form.validateFields();
    await kocrmApi.createCreator({ project_id: projectId, ...v, tags: v.tags ? v.tags.split(',').map((s: string) => s.trim()) : [] });
    message.success('达人已创建'); setModalOpen(false); load();
  };

  return (
    <Card size="small" extra={<Space>
      <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>新建达人</Button>
    </Space>}>
      <Table dataSource={data} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }}
        columns={[
          { title: '平台', dataIndex: 'platform', width: 100, render: (v: string) => <Tag color="purple">{v}</Tag> },
          { title: '达人名称', dataIndex: 'name', width: 150 },
          { title: 'UID', dataIndex: 'uid', width: 120 },
          { title: '粉丝数', dataIndex: 'followers', width: 100, render: (v: number) => v?.toLocaleString() || 0 },
          { title: '标签', dataIndex: 'tags', width: 200, render: (tags: string[]) => tags?.map((t: string) => <Tag key={t} style={{ marginBottom: 2 }}>{t}</Tag>) || '-' },
          { title: '状态', dataIndex: 'status', width: 80, render: (s: number) => <Tag color={s === 1 ? 'green' : 'default'}>{s === 1 ? '合作中' : '已停止'}</Tag> },
          { title: '操作', key: 'action', width: 100, render: (_: any, r: any) => (
            <Popconfirm title="确认删除?" onConfirm={async () => { await kocrmApi.deleteCreator(r.id); load(); }}>
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          )},
        ]}
      />
      <Modal title="新建达人" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="platform" label="平台" rules={[{ required: true }]}><Select options={[{ value: '抖音', label: '抖音' }, { value: '快手', label: '快手' }, { value: '小红书', label: '小红书' }, { value: 'B站', label: 'B站' }]} /></Form.Item>
          <Form.Item name="name" label="达人名称" rules={[{ required: true }]}><Input placeholder="例: 张三" /></Form.Item>
          <Form.Item name="uid" label="平台UID" rules={[{ required: true }]}><Input placeholder="平台用户ID" /></Form.Item>
          <Form.Item name="followers" label="粉丝数"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="tags" label="标签（逗号分隔）"><Input placeholder="例: 美妆,护肤,种草" /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

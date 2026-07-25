/**
 * 财务管理页 — 供应商 + 分成比例 + 对账信息
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, Tag, Tabs, message, Popconfirm, InputNumber, DatePicker } from 'antd';
import { PlusOutlined, ReloadOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { financeApi } from '@/services-new/v5';

export default function FinancePage() {
  return (
    <Tabs items={[
      { key: 'suppliers', label: '供应商管理', children: <SupplierTab /> },
      { key: 'ratios', label: '分成比例', children: <ShareRatioTab /> },
      { key: 'reconciliations', label: '对账信息', children: <ReconciliationTab /> },
    ]} />
  );
}

// ─── 供应商 Tab ───
function SupplierTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(((await financeApi.listSuppliers().catch(() => [])) as any[]) || []); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const v = await form.validateFields();
    await financeApi.createSupplier(v);
    message.success('供应商已创建'); setModalOpen(false); load();
  };

  return (
    <Card size="small" extra={<Space>
      <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
      <Button icon={<DownloadOutlined />} onClick={async () => { const res = await financeApi.exportReport('supplier') as any; message.success(`导出成功: ${res.rows} 条记录`); }}>导出Excel</Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>新建供应商</Button>
    </Space>}>
      <Table dataSource={data} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }}
        columns={[
          { title: '供应商名称', dataIndex: 'supplier_name', width: 200 },
          { title: '主体', dataIndex: 'subject', width: 150, render: (v: string) => v || '-' },
          { title: '联系人', dataIndex: 'contact', width: 100, render: (v: string) => v || '-' },
          { title: '电话', dataIndex: 'phone', width: 130, render: (v: string) => v || '-' },
          { title: '状态', dataIndex: 'status', width: 80, render: (s: number) => <Tag color={s === 1 ? 'green' : 'default'}>{s === 1 ? '启用' : '禁用'}</Tag> },
          { title: '操作', key: 'action', width: 100, render: (_: any, r: any) => (
            <Popconfirm title="确认删除?" onConfirm={async () => { await financeApi.deleteSupplier(r.id); load(); }}>
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          )},
        ]}
      />
      <Modal title="新建供应商" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="supplier_name" label="供应商名称" rules={[{ required: true }]}><Input placeholder="例: 抖音平台" /></Form.Item>
          <Form.Item name="subject" label="主体"><Input placeholder="公司主体名称" /></Form.Item>
          <Form.Item name="contact" label="联系人"><Input /></Form.Item>
          <Form.Item name="phone" label="电话"><Input /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

// ─── 分成比例 Tab ───
function ShareRatioTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(((await financeApi.listShareRatios().catch(() => [])) as any[]) || []); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const v = await form.validateFields();
    await financeApi.createShareRatio({ ...v, effective_date: v.effective_date?.format('YYYY-MM-DD') || new Date().toISOString().slice(0, 10) });
    message.success('分成比例已创建'); setModalOpen(false); load();
  };

  return (
    <Card size="small" extra={<Space>
      <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>新建比例</Button>
    </Space>}>
      <Table dataSource={data} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }}
        columns={[
          { title: '供应商ID', dataIndex: 'supplier_id', width: 100 },
          { title: '平台', dataIndex: 'platform', width: 120, render: (v: string) => <Tag>{v}</Tag> },
          { title: '分成比例', dataIndex: 'ratio', width: 100, render: (v: any) => `${v}%` },
          { title: '生效日期', dataIndex: 'effective_date', width: 120, render: (v: string) => v?.slice(0, 10) },
          { title: '状态', dataIndex: 'status', width: 80, render: (s: number) => <Tag color={s === 1 ? 'green' : 'default'}>{s === 1 ? '启用' : '禁用'}</Tag> },
          { title: '操作', key: 'action', width: 100, render: (_: any, r: any) => (
            <Popconfirm title="确认删除?" onConfirm={async () => { await financeApi.deleteShareRatio(r.id); load(); }}>
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          )},
        ]}
      />
      <Modal title="新建分成比例" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="supplier_id" label="供应商ID" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="platform" label="平台" rules={[{ required: true }]}><Select options={[{ value: '抖音', label: '抖音' }, { value: '快手', label: '快手' }, { value: '小红书', label: '小红书' }, { value: 'B站', label: 'B站' }]} /></Form.Item>
          <Form.Item name="ratio" label="分成比例 (%)" rules={[{ required: true }]}><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="effective_date" label="生效日期"><DatePicker style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

// ─── 对账信息 Tab ───
function ReconciliationTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(((await financeApi.listReconciliations().catch(() => [])) as any[]) || []); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const v = await form.validateFields();
    await financeApi.createReconciliation(v);
    message.success('对账记录已创建'); setModalOpen(false); load();
  };

  return (
    <Card size="small" extra={<Space>
      <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
      <Button icon={<DownloadOutlined />} onClick={async () => { const res = await financeApi.exportReport('reconciliation') as any; message.success(`导出成功: ${res.rows} 条记录`); }}>导出Excel</Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>新建对账</Button>
    </Space>}>
      <Table dataSource={data} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }}
        columns={[
          { title: '供应商ID', dataIndex: 'supplier_id', width: 100 },
          { title: '平台', dataIndex: 'platform', width: 100, render: (v: string) => <Tag>{v}</Tag> },
          { title: '游戏', dataIndex: 'game', width: 150 },
          { title: '账期', dataIndex: 'period', width: 100 },
          { title: '币种', dataIndex: 'currency', width: 80 },
          { title: '状态', dataIndex: 'status', width: 80, render: (s: number) => <Tag color={s === 1 ? 'green' : 'default'}>{s === 1 ? '正常' : '异常'}</Tag> },
          { title: '操作', key: 'action', width: 100, render: (_: any, r: any) => (
            <Popconfirm title="确认删除?" onConfirm={async () => { await financeApi.deleteReconciliation(r.id); load(); }}>
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          )},
        ]}
      />
      <Modal title="新建对账记录" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="supplier_id" label="供应商ID" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="platform" label="平台" rules={[{ required: true }]}><Select options={[{ value: '抖音', label: '抖音' }, { value: '快手', label: '快手' }, { value: '小红书', label: '小红书' }]} /></Form.Item>
          <Form.Item name="game" label="游戏名称" rules={[{ required: true }]}><Input placeholder="例: 原神" /></Form.Item>
          <Form.Item name="period" label="账期" rules={[{ required: true }]}><Input placeholder="例: 2026-07" /></Form.Item>
          <Form.Item name="currency" label="币种" initialValue="CNY"><Select options={[{ value: 'CNY', label: 'CNY' }, { value: 'USD', label: 'USD' }]} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

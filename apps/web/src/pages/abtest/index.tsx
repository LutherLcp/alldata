/**
 * A/B Test 科学实验平台与 Feature Flags 灰度中心页
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Tag, Tabs, Switch, Typography, message } from 'antd';
import { ExperimentOutlined, PlusOutlined, ReloadOutlined, TrophyOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function ABTestPage() {
  return (
    <Card title={<Space><ExperimentOutlined style={{ color: '#722ed1', fontSize: 20 }} /><span>A/B Testing 科学实验平台与 Feature Flags 灰度中心</span></Space>}>
      <Tabs
        items={[
          { key: 'experiments', label: 'A/B 假设检验实验', children: <ExperimentTab /> },
          { key: 'flags', label: 'Feature Flags 灰度开关', children: <FlagTab /> },
        ]}
      />
    </Card>
  );
}

// ─── A/B 实验 Tab ───
function ExperimentTab() {
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    setTimeout(() => {
      setExperiments([
        {
          id: 1,
          key: 'exp_homepage_banner_v2',
          name: '首页大促 Banner 文案与视觉样式 A/B 实验',
          hypothesis: '将 Banner 按钮改为红底白字高光样式可提升下单点击率 15%',
          target_metric: 'checkout_click_rate',
          status: 2,
          p_value: 0.0124,
          winning_variant: '实验组 B (Red Highlighting)',
          variants: [
            { name: '对照组 A (Control)', weight: 50, sample_count: 5000, conversion_count: 450, conversion_rate: 9.0, is_winner: false },
            { name: '实验组 B (Red Highlighting)', weight: 50, sample_count: 5000, conversion_count: 680, conversion_rate: 13.6, is_winner: true, p_value: 0.0124 },
          ],
          created_at: '2026-07-20 12:00:00',
        },
      ]);
      setLoading(false);
    }, 300);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    const v = await form.validateFields();
    message.success(`A/B 实验 "${v.name}" 已创建，正通过 Hash 算法开启全量多组分流`);
    setModalOpen(false);
    loadData();
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
            新建 A/B 实验
          </Button>
        </Space>
      </div>

      <Table
        dataSource={experiments}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10 }}
        columns={[
          { title: '实验名称', dataIndex: 'name', width: 240, render: (t: string) => <Text style={{ fontWeight: 'bold' }}>{t}</Text> },
          { title: '实验假设', dataIndex: 'hypothesis', ellipsis: true },
          { title: '目标指标', dataIndex: 'target_metric', width: 150, render: (m: string) => <Tag color="purple">{m}</Tag> },
          { title: '显著性 (p-value)', dataIndex: 'p_value', width: 140, render: (p: number) => <Tag color={p < 0.05 ? 'success' : 'warning'}>p = {p} ({p < 0.05 ? '结果显著' : '未显著'})</Tag> },
          { title: '胜出变量', dataIndex: 'winning_variant', width: 200, render: (w: string) => <Tag color="gold"><TrophyOutlined /> {w}</Tag> },
          { title: '状态', dataIndex: 'status', width: 90, render: (s: number) => <Tag color={s === 2 ? 'processing' : 'default'}>{s === 2 ? '实验中' : '已归档'}</Tag> },
        ]}
      />

      <Modal title="新建 A/B 假设计验实验" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="实验名称" rules={[{ required: true }]}>
            <Input placeholder="例: 推荐算法 V2 落地页 CTR 提升实验" />
          </Form.Item>
          <Form.Item name="key" label="实验标识 Key" rules={[{ required: true }]}>
            <Input placeholder="例: exp_rec_v2_checkout" />
          </Form.Item>
          <Form.Item name="target_metric" label="目标评估核心指标" rules={[{ required: true }]}>
            <Input placeholder="例: conversion_rate / order_count" />
          </Form.Item>
          <Form.Item name="hypothesis" label="核心假设计验">
            <Input.TextArea rows={2} placeholder="预期改变将带来何种指标提升..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Feature Flags Tab ───
function FlagTab() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setTimeout(() => {
      setFlags([
        { id: 1, key: 'enable_new_checkout_ui', name: '新版极速收银台页面灰度开关', rollout_percentage: 30, status: 1, created_at: '2026-07-22' },
        { id: 2, key: 'ai_copilot_preview', name: 'AI 问答 Copilot 内测功能开关', rollout_percentage: 100, status: 1, created_at: '2026-07-25' },
      ]);
      setLoading(false);
    }, 300);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div>
      <Table
        dataSource={flags}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={false}
        columns={[
          { title: '开关 Key', dataIndex: 'key', width: 220, render: (k: string) => <code>{k}</code> },
          { title: '功能开关名称', dataIndex: 'name', render: (t: string) => <Text style={{ fontWeight: 'bold' }}>{t}</Text> },
          { title: '灰度放量比例', dataIndex: 'rollout_percentage', width: 200, render: (pct: number) => <Tag color="blue">{pct}% 流量放量</Tag> },
          { title: '状态开关', dataIndex: 'status', width: 100, render: (s: number) => <Switch defaultChecked={s === 1} onChange={(val) => message.info(`开关状态已切换为: ${val ? '开启' : '关闭'}`)} /> },
        ]}
      />
    </div>
  );
}

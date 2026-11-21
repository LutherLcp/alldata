import { abtestApi } from '@/services/abtest';
import { useGlobalStore } from '@/stores/global';
import {
  ExperimentOutlined,
  PlusOutlined,
  ReloadOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
/**
 * A/B Test 科学实验平台与 Feature Flags 灰度中心页
 */
import { useCallback, useEffect, useState } from 'react';

const { Text } = Typography;

export default function ABTestPage() {
  const currentProject = useGlobalStore((s) => s.currentProject);
  const projectId = currentProject?.id || 1;

  return (
    <Card
      title={
        <Space>
          <ExperimentOutlined style={{ color: '#722ed1', fontSize: 20 }} />
          <span>A/B Testing 科学实验平台与 Feature Flags 灰度中心</span>
        </Space>
      }
    >
      <Tabs
        items={[
          {
            key: 'experiments',
            label: 'A/B 假设检验实验',
            children: <ExperimentTab projectId={projectId} />,
          },
          {
            key: 'flags',
            label: 'Feature Flags 灰度开关',
            children: <FlagTab projectId={projectId} />,
          },
        ]}
      />
    </Card>
  );
}

// ─── A/B 实验 Tab ───
function ExperimentTab({ projectId }: { projectId: number }) {
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await abtestApi.listExperiments(projectId);
      setExperiments(Array.isArray(data) ? data : []);
    } catch {
      // 允许降级
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    const v = await form.validateFields();
    try {
      await abtestApi.createExperiment({
        project_id: projectId,
        key: v.key,
        name: v.name,
        target_metric: v.target_metric,
        hypothesis: v.hypothesis,
      });
      message.success(`A/B 实验 "${v.name}" 已创建，正通过 Hash 算法开启全量多组分流`);
      setModalOpen(false);
      loadData();
    } catch {
      message.error('创建 A/B 实验失败');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setModalOpen(true);
            }}
          >
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
          {
            title: '实验名称',
            dataIndex: 'name',
            width: 240,
            render: (t: string) => <Text style={{ fontWeight: 'bold' }}>{t}</Text>,
          },
          { title: '实验假设', dataIndex: 'hypothesis', ellipsis: true },
          {
            title: '目标指标',
            dataIndex: 'target_metric',
            width: 150,
            render: (m: string) => <Tag color="purple">{m}</Tag>,
          },
          {
            title: '显著性 (p-value)',
            dataIndex: 'p_value',
            width: 140,
            render: (p: number) => (
              <Tag color={p < 0.05 ? 'success' : 'warning'}>
                p = {p ?? '-'} ({p < 0.05 ? '结果显著' : '未显著'})
              </Tag>
            ),
          },
          {
            title: '胜出变量',
            dataIndex: 'winning_variant',
            width: 200,
            render: (w: string) =>
              w ? (
                <Tag color="gold">
                  <TrophyOutlined /> {w}
                </Tag>
              ) : (
                <Text type="secondary">尚未分出胜负</Text>
              ),
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 90,
            render: (s: number) => (
              <Tag color={s === 2 ? 'processing' : 'default'}>{s === 2 ? '实验中' : '已归档'}</Tag>
            ),
          },
        ]}
      />

      <Modal
        title="新建 A/B 假设检验实验"
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
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
function FlagTab({ projectId }: { projectId: number }) {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagForm] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await abtestApi.listFlags(projectId);
      setFlags(Array.isArray(data) ? data : []);
    } catch {
      // 允许降级
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (record: any, checked: boolean) => {
    try {
      await abtestApi.updateFlag(record.id, { status: checked ? 1 : 2 }, projectId);
      message.success(`开关「${record.name}」已${checked ? '开启' : '关闭'}`);
      loadData();
    } catch {
      message.error('切换开关状态失败');
    }
  };

  const handleCreateFlag = async () => {
    const v = await flagForm.validateFields();
    try {
      await abtestApi.createFlag({
        project_id: projectId,
        key: v.key,
        name: v.name,
        description: v.description,
        rollout_percentage: v.rollout_percentage ?? 10,
        status: 1,
      });
      message.success(`灰度开关「${v.name}」已创建`);
      setFlagModalOpen(false);
      loadData();
    } catch {
      message.error('创建开关失败');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              flagForm.resetFields();
              setFlagModalOpen(true);
            }}
          >
            新建灰度开关
          </Button>
        </Space>
      </div>

      <Table
        dataSource={flags}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={false}
        columns={[
          {
            title: '开关 Key',
            dataIndex: 'key',
            width: 220,
            render: (k: string) => <code>{k}</code>,
          },
          {
            title: '功能开关名称',
            dataIndex: 'name',
            render: (t: string) => <Text style={{ fontWeight: 'bold' }}>{t}</Text>,
          },
          {
            title: '灰度放量比例',
            dataIndex: 'rollout_percentage',
            width: 200,
            render: (pct: number) => <Tag color="blue">{pct}% 流量放量</Tag>,
          },
          {
            title: '状态开关',
            dataIndex: 'status',
            width: 100,
            render: (s: number, record: any) => (
              <Switch checked={s === 1} onChange={(val) => handleToggle(record, val)} />
            ),
          },
        ]}
      />

      <Modal
        title="新建 Feature Flag 灰度开关"
        open={flagModalOpen}
        onOk={handleCreateFlag}
        onCancel={() => setFlagModalOpen(false)}
        destroyOnClose
      >
        <Form form={flagForm} layout="vertical">
          <Form.Item name="name" label="开关名称" rules={[{ required: true }]}>
            <Input placeholder="例: 极速支付模块新组件" />
          </Form.Item>
          <Form.Item name="key" label="开关 Key" rules={[{ required: true }]}>
            <Input placeholder="例: enable_fast_checkout_v3" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="功能说明与适用流量场景" />
          </Form.Item>
          <Form.Item name="rollout_percentage" label="初始灰度比例 (%)" initialValue={20}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

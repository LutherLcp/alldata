import { type FlowExecutionResponse, marketingApi } from '@/services/marketing';
import { useGlobalStore } from '@/stores/global';
import type { MarketingFlow } from '@alldata/shared/types';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  PartitionOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';

const { Text } = Typography;

export default function MarketingFlowPage() {
  const currentProject = useGlobalStore((s) => s.currentProject);
  const projectId = currentProject?.id || 1;

  const [flows, setFlows] = useState<MarketingFlow[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<MarketingFlow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [lastExecution, setLastExecution] = useState<FlowExecutionResponse | null>(null);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await marketingApi.listFlows(projectId);
      setFlows(data || []);
      if (selectedFlow) {
        const found = (data || []).find((f) => f.id === selectedFlow.id);
        if (found) setSelectedFlow(found);
      }
    } catch (err) {
      message.error((err as Error).message || '加载营销 Flow 失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedFlow]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCanvas = (flow: MarketingFlow) => {
    setSelectedFlow(flow);
    setLastExecution(null);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    try {
      const v = await form.validateFields();
      await marketingApi.createFlow({
        project_id: projectId,
        name: v.name,
        description: v.description,
        trigger_type: v.trigger_type,
      });
      message.success(`营销 Flow "${v.name}" 已新建，可双击进入节点画布设计`);
      setModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error((err as Error).message || '创建营销 Flow 失败');
    }
  };

  const handleDelete = async (flowId: number) => {
    try {
      await marketingApi.deleteFlow(flowId, projectId);
      message.success('工作流已成功删除');
      loadData();
    } catch (err) {
      message.error((err as Error).message || '删除失败');
    }
  };

  const handleSimulateExecute = async () => {
    if (!selectedFlow) return;
    setExecuting(true);
    try {
      const userId = `USR_${Math.floor(1000 + (Date.now() % 9000))}`;
      const result = await marketingApi.executeFlow(
        selectedFlow.id,
        {
          user_id: userId,
          event_name: 'submit_order',
          properties: {
            ltv: 92,
            days: 16,
            timeout_min: 35,
            converted: true,
          },
          is_converted: true,
        },
        projectId,
      );
      setLastExecution(result);
      message.success(
        `全流程自动化模拟执行完成！已下发 ${result.executed_actions.length} 个触达动作`,
      );
      loadData();
    } catch (err) {
      message.error((err as Error).message || '执行模拟失败');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Card
      title={
        <Space>
          <PartitionOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
          <span>智能营销自动化 Flow 画布管理中心</span>
        </Space>
      }
      extra={
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
            新建营销 Flow 画布
          </Button>
        </Space>
      }
    >
      <Table
        dataSource={flows}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: 'Flow 工作流名称',
            dataIndex: 'name',
            width: 260,
            render: (t: string, r: MarketingFlow) => (
              <Button type="link" style={{ padding: 0 }} onClick={() => handleOpenCanvas(r)}>
                {t}
              </Button>
            ),
          },
          {
            title: '触发机制',
            dataIndex: 'trigger_type',
            width: 110,
            render: (t: string) => {
              const map: Record<string, string> = {
                event: '事件触发',
                cron: '定时轮询',
                cohort: '人群包准入',
              };
              return <Tag color="geekblue">{map[t] || t}</Tag>;
            },
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 90,
            render: (s: number) => (
              <Tag color={s === 2 ? 'success' : 'default'}>
                {s === 2 ? '运行中' : s === 3 ? '已暂停' : '草稿'}
              </Tag>
            ),
          },
          {
            title: '累计触达人数',
            dataIndex: 'triggered_count',
            width: 140,
            render: (c: number) => <Tag color="blue">{(c || 0).toLocaleString()} 人</Tag>,
          },
          {
            title: '转化人数',
            dataIndex: 'conversion_count',
            width: 120,
            render: (c: number) => `${c || 0} 人`,
          },
          {
            title: '转化率 (CR)',
            dataIndex: 'conversion_rate',
            width: 120,
            render: (r: number) => (
              <Text style={{ fontWeight: 'bold', color: '#52c41a' }}>{r || 0}%</Text>
            ),
          },
          { title: '创建时间', dataIndex: 'created_at', width: 180 },
          {
            title: '操作',
            key: 'action',
            width: 180,
            render: (_: any, r: MarketingFlow) => (
              <Space>
                <Button
                  type="link"
                  size="small"
                  icon={<PartitionOutlined />}
                  onClick={() => handleOpenCanvas(r)}
                >
                  设计画布
                </Button>
                <Popconfirm title="确认删除该工作流?" onConfirm={() => handleDelete(r.id)}>
                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title="新建智能营销 Flow 画布"
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="工作流名称"
            rules={[{ required: true, message: '请输入 Flow 名称' }]}
          >
            <Input placeholder="例: 流失预警人群自动发放冲刺券 Flow" />
          </Form.Item>
          <Form.Item name="description" label="描述说明">
            <Input.TextArea rows={2} placeholder="描述营销目的、目标受众与期望转化率..." />
          </Form.Item>
          <Form.Item name="trigger_type" label="触发机制类型" initialValue="event">
            <Select
              options={[
                { value: 'event', label: '实时事件触发 (Event-based Trigger)' },
                { value: 'cron', label: '定时周期轮询 (Cron Schedule)' },
                { value: 'cohort', label: '进入特定人群包触发 (Cohort Entry)' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={selectedFlow ? `营销 Flow 可视化节点画布 — ${selectedFlow.name}` : 'Flow 画布设计器'}
        width="80%"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Space>
            <Button
              icon={<PlayCircleOutlined />}
              type="primary"
              loading={executing}
              onClick={handleSimulateExecute}
            >
              模拟运行测试
            </Button>
          </Space>
        }
      >
        {selectedFlow && (
          <div>
            <Row gutter={16} style={{ marginBottom: 20 }}>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="当前触达总人数"
                    value={selectedFlow.triggered_count || 0}
                    suffix="人"
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="最终转化人数"
                    value={selectedFlow.conversion_count || 0}
                    suffix="人"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="整体营销 ROI 转化率"
                    value={selectedFlow.conversion_rate || 0}
                    suffix="%"
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
            </Row>

            {lastExecution && (
              <Alert
                style={{ marginBottom: 20 }}
                type={lastExecution.triggered ? 'success' : 'warning'}
                message={`测试执行流水: 用户 [${lastExecution.user_id}] - ${
                  lastExecution.triggered ? '触达成功' : '未触发'
                }`}
                description={
                  <div style={{ marginTop: 8 }}>
                    <div style={{ marginBottom: 8 }}>
                      <strong>触达动作:</strong>{' '}
                      {lastExecution.executed_actions.length === 0 ? (
                        <Text type="secondary">无触发动作</Text>
                      ) : (
                        lastExecution.executed_actions.map((act) => (
                          <Tag key={act.node_id} color="cyan">
                            {act.channel}: {act.detail}
                          </Tag>
                        ))
                      )}
                    </div>
                    <Timeline
                      style={{ marginTop: 12 }}
                      items={lastExecution.trace.map((step) => ({
                        color:
                          step.status === 'executed' || step.status === 'matched'
                            ? 'green'
                            : step.status === 'passed'
                              ? 'blue'
                              : 'gray',
                        children: (
                          <div>
                            <Text strong>{step.label}</Text> ({step.type}) -{' '}
                            <Tag>{step.status}</Tag>
                            {step.detail && <span> {step.detail}</span>}
                          </div>
                        ),
                      }))}
                    />
                  </div>
                }
                showIcon
                icon={<CheckCircleOutlined />}
              />
            )}

            <Card
              title="Flow 节点连线控制树 (Flow Engine Graph)"
              style={{ minHeight: 350, backgroundColor: '#f8f9fa' }}
            >
              <Space size="large" align="center" style={{ flexWrap: 'wrap', padding: '20px 0' }}>
                {(selectedFlow.nodes || []).map((n: any, idx: number) => (
                  <Space key={n.id}>
                    <Card
                      size="small"
                      style={{
                        width: 220,
                        border:
                          n.type === 'trigger'
                            ? '2px solid #1890ff'
                            : n.type === 'condition'
                              ? '2px solid #faad14'
                              : n.type === 'split'
                                ? '2px solid #722ed1'
                                : '2px solid #52c41a',
                      }}
                    >
                      <Tag
                        color={
                          n.type === 'trigger'
                            ? 'blue'
                            : n.type === 'condition'
                              ? 'warning'
                              : n.type === 'split'
                                ? 'purple'
                                : 'success'
                        }
                        style={{ marginBottom: 8 }}
                      >
                        {n.type === 'trigger'
                          ? '触发节点'
                          : n.type === 'condition'
                            ? '条件分支'
                            : n.type === 'split'
                              ? '分流节点'
                              : '触达动作'}
                      </Tag>
                      <div style={{ fontWeight: 'bold' }}>{n.label}</div>
                    </Card>
                    {idx < (selectedFlow.nodes?.length || 0) - 1 && (
                      <RightOutlined style={{ fontSize: 24, color: '#bfbfbf' }} />
                    )}
                  </Space>
                ))}
              </Space>
            </Card>
          </div>
        )}
      </Drawer>
    </Card>
  );
}

/**
 * 智能营销自动化 Flow 画布与调度管理中心页
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, Tag, Drawer, Statistic, Row, Col, Typography, message, Popconfirm } from 'antd';
import { PartitionOutlined, PlusOutlined, ReloadOutlined, PlayCircleOutlined, DeleteOutlined, RightOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function MarketingFlowPage() {
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    setTimeout(() => {
      setFlows([
        {
          id: 1,
          name: '流失风险用户飞书卡片自动关怀 Flow',
          description: '当高价值用户超过14天未访问时，自动触发飞书卡片与优惠券推送',
          status: 2,
          trigger_type: 'event',
          nodes: [
            { id: 'n1', type: 'trigger', label: '触发: 用户离场 > 14天' },
            { id: 'n2', type: 'condition', label: '判断: LTV得分 >= 80' },
            { id: 'n3', type: 'action', label: '触达: 发送飞书机器人关怀卡片' },
          ],
          triggered_count: 1250,
          conversion_count: 312,
          conversion_rate: 24.96,
          created_at: '2026-07-25 14:00:00',
        },
        {
          id: 2,
          name: '新客首单未支付短信催付 Flow',
          description: '加购商品30分钟内未提交订单，自动下发催付提醒',
          status: 2,
          trigger_type: 'event',
          nodes: [
            { id: 'n1', type: 'trigger', label: '触发: 提交订单' },
            { id: 'n2', type: 'condition', label: '判断: 30分钟未支付' },
            { id: 'n3', type: 'action', label: '触达: 触发短信催付通知' },
          ],
          triggered_count: 3400,
          conversion_count: 1120,
          conversion_rate: 32.94,
          created_at: '2026-07-28 10:30:00',
        },
      ]);
      setLoading(false);
    }, 300);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCanvas = (flow: any) => {
    setSelectedFlow(flow);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    const v = await form.validateFields();
    message.success(`营销 Flow "${v.name}" 已新建，可双击进入节点画布设计`);
    setModalOpen(false);
    loadData();
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
          <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
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
          { title: 'Flow 工作流名称', dataIndex: 'name', width: 260, render: (t: string, r: any) => <a onClick={() => handleOpenCanvas(r)}>{t}</a> },
          { title: '状态', dataIndex: 'status', width: 90, render: (s: number) => <Tag color={s === 2 ? 'success' : 'default'}>{s === 2 ? '运行中' : '草稿'}</Tag> },
          { title: '累计触达人数', dataIndex: 'triggered_count', width: 140, render: (c: number) => <Tag color="blue">{c.toLocaleString()} 人</Tag> },
          { title: '转化人数', dataIndex: 'conversion_count', width: 120, render: (c: number) => `${c} 人` },
          { title: '转化率 (CR)', dataIndex: 'conversion_rate', width: 120, render: (r: number) => <Text style={{ fontWeight: 'bold', color: '#52c41a' }}>{r}%</Text> },
          { title: '创建时间', dataIndex: 'created_at', width: 180 },
          {
            title: '操作',
            key: 'action',
            width: 180,
            render: (_: any, r: any) => (
              <Space>
                <Button type="link" size="small" icon={<PartitionOutlined />} onClick={() => handleOpenCanvas(r)}>
                  设计画布
                </Button>
                <Popconfirm title="确认删除该工作流?" onConfirm={() => message.success('已删除')}>
                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal title="新建智能营销 Flow 画布" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="工作流名称" rules={[{ required: true, message: '请输入 Flow 名称' }]}>
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
            <Button icon={<PlayCircleOutlined />} type="primary" onClick={() => message.success('模拟全流程自动化测试成功！已触发飞书消息并更新分析日志')}>
              模拟运行测试
            </Button>
          </Space>
        }
      >
        {selectedFlow && (
          <div>
            <Row gutter={16} style={{ marginBottom: 20 }}>
              <Col span={8}><Card size="small"><Statistic title="当前触达总人数" value={selectedFlow.triggered_count} suffix="人" /></Card></Col>
              <Col span={8}><Card size="small"><Statistic title="最终转化人数" value={selectedFlow.conversion_count} suffix="人" valueStyle={{ color: '#52c41a' }} /></Card></Col>
              <Col span={8}><Card size="small"><Statistic title="整体营销 ROI 转化率" value={selectedFlow.conversion_rate} suffix="%" valueStyle={{ color: '#722ed1' }} /></Card></Col>
            </Row>

            <Card title="Flow 节点连线控制树 (Flow Engine Graph)" style={{ minHeight: 350, backgroundColor: '#f8f9fa' }}>
              <Space size="large" align="center" style={{ flexWrap: 'wrap', padding: '20px 0' }}>
                {selectedFlow.nodes.map((n: any, idx: number) => (
                  <Space key={n.id}>
                    <Card size="small" style={{ width: 220, border: n.type === 'trigger' ? '2px solid #1890ff' : n.type === 'condition' ? '2px solid #faad14' : '2px solid #52c41a' }}>
                      <Tag color={n.type === 'trigger' ? 'blue' : n.type === 'condition' ? 'warning' : 'success'} style={{ marginBottom: 8 }}>
                        {n.type === 'trigger' ? '触发节点' : n.type === 'condition' ? '条件分支' : '触达动作'}
                      </Tag>
                      <div style={{ fontWeight: 'bold' }}>{n.label}</div>
                    </Card>
                    {idx < selectedFlow.nodes.length - 1 && <RightOutlined style={{ fontSize: 24, color: '#bfbfbf' }} />}
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

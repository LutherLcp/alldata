/**
 * 全域埋点管理页 — 埋点需求 (Story) + 事件定义 (Event) + 属性管理 (Property)
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, Select, Tag, Switch,
  Typography, message, Tabs, Drawer, Descriptions, Popconfirm, Row, Col, Statistic,
} from 'antd';
import {
  PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  TagOutlined, BookOutlined, ControlOutlined,
} from '@ant-design/icons';
import { useGlobalStore } from '@/stores/global';
import { trackingApi, Story, EventDef, EventProperty } from '@/services-new/tracking';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATUS_MAP: Record<number, { color: string; text: string }> = {
  1: { color: 'green', text: '启用' },
  2: { color: 'default', text: '禁用' },
};

export default function TrackingPage() {
  const currentProject = useGlobalStore((s) => s.currentProject);
  const projectId = currentProject?.id ?? 1;

  const [stories, setStories] = useState<Story[]>([]);
  const [events, setEvents] = useState<EventDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('events');

  // 弹窗状态
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [propModalOpen, setPropModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventDef | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<number | undefined>();

  const [storyForm] = Form.useForm();
  const [eventForm] = Form.useForm();
  const [propForm] = Form.useForm();

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [s, e] = await Promise.all([
        trackingApi.listStories(projectId).catch(() => []),
        trackingApi.listEvents(projectId, selectedStoryId).catch(() => []),
      ]);
      setStories(Array.isArray(s) ? s : []);
      setEvents(Array.isArray(e) ? e : []);
    } catch {
      setStories([]);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedStoryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Story CRUD
  const handleSaveStory = async () => {
    const v = await storyForm.validateFields();
    await trackingApi.createStory({ project_id: projectId, ...v });
    message.success('埋点需求已创建');
    setStoryModalOpen(false);
    loadData();
  };

  // Event CRUD
  const handleSaveEvent = async () => {
    const v = await eventForm.validateFields();
    if (editingEvent) {
      await trackingApi.updateEvent(editingEvent.id, v);
      message.success('事件定义已更新');
    } else {
      await trackingApi.createEvent({ project_id: projectId, ...v });
      message.success('事件定义已创建');
    }
    setEventModalOpen(false);
    setEditingEvent(null);
    loadData();
  };

  // Property CRUD
  const handleSaveProperty = async () => {
    if (!editingEvent) return;
    const v = await propForm.validateFields();
    await trackingApi.createProperty(editingEvent.id, v);
    message.success('事件属性已添加');
    setPropModalOpen(false);
    loadData();
  };

  const eventColumns = [
    { title: '事件标识', dataIndex: 'name', key: 'name', width: 180, render: (v: string) => <Text code>{v}</Text> },
    { title: '显示名', dataIndex: 'display_name', key: 'display_name', width: 160, render: (v: string) => v || '-' },
    { title: '所属需求', key: 'story', width: 160, render: (_: any, r: EventDef) => r.story?.name ? <Tag color="blue">{r.story.name}</Tag> : '-' },
    { title: '属性数量', key: 'props', width: 100, render: (_: any, r: EventDef) => <Tag color="purple">{r.properties?.length || 0} 个</Tag> },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (s: number) => {
        const item = STATUS_MAP[s] || { color: 'green', text: '启用' };
        return <Tag color={item.color}>{item.text}</Tag>;
      },
    },
    {
      title: '操作', key: 'action', width: 220,
      render: (_: any, r: EventDef) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setEditingEvent(r)}>详情</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditingEvent(r); eventForm.setFieldsValue(r); setEventModalOpen(true); }}>编辑</Button>
          <Popconfirm title="确认删除该事件定义?" onConfirm={async () => { await trackingApi.deleteEvent(r.id); loadData(); }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 顶部数据看板概览 */}
      <Row gutter={16}>
        <Col span={8}>
          <Card size="small" style={{ background: 'linear-gradient(135deg, #1890ff15 0%, #1890ff05 100%)' }}>
            <Statistic
              title={<Space><TagOutlined /> 已注册埋点事件</Space>}
              value={events.length}
              suffix="个"
              valueStyle={{ color: '#1890ff', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ background: 'linear-gradient(135deg, #52c41a15 0%, #52c41a05 100%)' }}>
            <Statistic
              title={<Space><BookOutlined /> 关联需求文档</Space>}
              value={stories.length}
              suffix="项"
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ background: 'linear-gradient(135deg, #722ed115 0%, #722ed105 100%)' }}>
            <Statistic
              title={<Space><ControlOutlined /> 激活事件比例</Space>}
              value={events.length > 0 ? Math.round((events.filter(e => e.status !== 2).length / events.length) * 100) : 100}
              suffix="%"
              valueStyle={{ color: '#722ed1', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 主面板：事件列表 + 需求管理 */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'events',
            label: <Space><TagOutlined /> 事件列表 ({events.length})</Space>,
            children: (
              <Card
                title="全域埋点事件规范矩阵"
                extra={
                  <Space>
                    <Select
                      allowClear
                      placeholder="按需求筛选"
                      style={{ width: 200 }}
                      options={(stories || []).map((s) => ({ value: s.id, label: s.name }))}
                      onChange={(v) => setSelectedStoryId(v)}
                    />
                    <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => { setEditingEvent(null); eventForm.resetFields(); setEventModalOpen(true); }}
                    >
                      新建事件
                    </Button>
                  </Space>
                }
              >
                <Table
                  dataSource={events}
                  columns={eventColumns}
                  rowKey="id"
                  loading={loading}
                  size="small"
                  pagination={{ pageSize: 15, showTotal: (total) => `共 ${total} 条事件` }}
                />
              </Card>
            ),
          },
          {
            key: 'stories',
            label: <Space><BookOutlined /> 需求管理 ({stories.length})</Space>,
            children: (
              <Card
                title="埋点需求文档与版本规范"
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => { storyForm.resetFields(); setStoryModalOpen(true); }}
                  >
                    新建需求
                  </Button>
                }
              >
                <Table
                  dataSource={stories}
                  rowKey="id"
                  loading={loading}
                  size="small"
                  pagination={{ pageSize: 15, showTotal: (total) => `共 ${total} 项需求` }}
                  columns={[
                    { title: '需求名称', dataIndex: 'name', render: (v: string) => <Text strong>{v}</Text> },
                    { title: '文档链接', dataIndex: 'docs_url', render: (v: string) => v ? <a href={v} target="_blank" rel="noreferrer">查看在线文档</a> : '-' },
                    { title: '事件关联数', key: 'count', render: (_: any, r: Story) => <Tag color="blue">{r._count?.events || 0} 个事件</Tag> },
                    {
                      title: '状态', dataIndex: 'status', render: (s: number) => {
                        const item = STATUS_MAP[s] || { color: 'green', text: '进行中' };
                        return <Tag color={item.color}>{item.text}</Tag>;
                      },
                    },
                    {
                      title: '操作', key: 'action', render: (_: any, r: Story) => (
                        <Space>
                          <Button type="link" size="small" onClick={() => { setSelectedStoryId(r.id); setActiveTab('events'); }}>
                            查看事件
                          </Button>
                          <Popconfirm title="确认删除该需求及其对应事件关系?" onConfirm={async () => { await trackingApi.deleteStory(r.id); loadData(); }}>
                            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* 事件详情与属性管理 Drawer */}
      <Drawer
        title={<Space><TagOutlined /> 事件属性详情: <Text code>{editingEvent?.name}</Text></Space>}
        open={!!editingEvent && !eventModalOpen && !propModalOpen}
        onClose={() => setEditingEvent(null)}
        width={560}
      >
        {editingEvent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="事件标识"><Text code>{editingEvent.name}</Text></Descriptions.Item>
              <Descriptions.Item label="显示名称">{editingEvent.display_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="详细描述">{editingEvent.description || '-'}</Descriptions.Item>
              <Descriptions.Item label="所属需求">{editingEvent.story?.name || '-'}</Descriptions.Item>
            </Descriptions>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={5} style={{ margin: 0 }}>事件属性定义 ({editingEvent.properties?.length || 0})</Title>
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => { propForm.resetFields(); setPropModalOpen(true); }}>
                添加属性
              </Button>
            </div>

            <Table
              dataSource={editingEvent.properties || []}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: '属性 Key', dataIndex: 'name', render: (v: string) => <Text code>{v}</Text> },
                { title: '数据类型', dataIndex: 'data_type', render: (v: string) => <Tag color="orange">{v}</Tag> },
                { title: '是否必填', dataIndex: 'is_required', render: (v: boolean) => v ? <Tag color="red">必填</Tag> : <Tag>可选</Tag> },
                {
                  title: '操作', key: 'action', render: (_: any, r: EventProperty) => (
                    <Popconfirm title="确认删除该属性?" onConfirm={async () => { await trackingApi.deleteProperty(r.id); loadData(); }}>
                      <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Drawer>

      {/* Story 新建 Modal */}
      <Modal title="新建埋点需求文档" open={storyModalOpen} onOk={handleSaveStory} onCancel={() => setStoryModalOpen(false)} destroyOnClose>
        <Form form={storyForm} layout="vertical">
          <Form.Item name="name" label="需求名称" rules={[{ required: true, message: '请输入需求名称' }]}><Input placeholder="例: V9.0 购物车推荐逻辑埋点" /></Form.Item>
          <Form.Item name="docs_url" label="文档 / PRD 链接"><Input placeholder="例: https://wiki.example.com/prd/v9" /></Form.Item>
        </Form>
      </Modal>

      {/* Event 新建/编辑 Modal */}
      <Modal title={editingEvent ? '编辑事件定义' : '新建事件定义'} open={eventModalOpen} onOk={handleSaveEvent} onCancel={() => { setEventModalOpen(false); setEditingEvent(null); }} destroyOnClose>
        <Form form={eventForm} layout="vertical">
          <Form.Item name="name" label="事件标识 (Name)" rules={[{ required: true, message: '请输入事件标识' }]}><Input placeholder="例: page_view_checkout" disabled={!!editingEvent} /></Form.Item>
          <Form.Item name="display_name" label="显示名称"><Input placeholder="例: 结算页浏览" /></Form.Item>
          <Form.Item name="description" label="功能描述"><TextArea rows={3} placeholder="描述该埋点触发时机与逻辑" /></Form.Item>
          <Form.Item name="story_id" label="关联埋点需求">
            <Select allowClear placeholder="请选择需求" options={(stories || []).map((s) => ({ value: s.id, label: s.name }))} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Property 添加 Modal */}
      <Modal title="添加事件属性" open={propModalOpen} onOk={handleSaveProperty} onCancel={() => setPropModalOpen(false)} destroyOnClose>
        <Form form={propForm} layout="vertical">
          <Form.Item name="name" label="属性 Key" rules={[{ required: true, message: '请输入属性 Key' }]}><Input placeholder="例: order_amount" /></Form.Item>
          <Form.Item name="data_type" label="数据类型" rules={[{ required: true, message: '请选择数据类型' }]}>
            <Select options={[{ value: 'string', label: 'String (字符串)' }, { value: 'number', label: 'Number (数值)' }, { value: 'boolean', label: 'Boolean (布尔)' }]} />
          </Form.Item>
          <Form.Item name="is_required" label="是否必填" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="description" label="属性说明"><Input placeholder="可选" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

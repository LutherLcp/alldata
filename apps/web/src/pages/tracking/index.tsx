/**
 * 埋点管理页 — Story 列表 + Event 列表 + 属性管理
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, Select, Tag, Switch,
  Typography, message, Tabs, Drawer, Descriptions, Popconfirm,
} from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useGlobalStore } from '@/stores/global';
import { trackingApi, Story, EventDef, EventProperty } from '@/services-new/tracking';

const { Title } = Typography;
const { TextArea } = Input;

const STATUS_MAP: Record<number, { color: string; text: string }> = {
  1: { color: 'green', text: '启用' },
  2: { color: 'default', text: '禁用' },
};

export default function TrackingPage() {
  const currentProject = useGlobalStore((s) => s.currentProject);
  const projectId = currentProject?.id;

  const [stories, setStories] = useState<Story[]>([]);
  const [events, setEvents] = useState<EventDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('events');

  // 弹窗
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
      setStories(s || []);
      setEvents(e || []);
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedStoryId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Story CRUD
  const handleSaveStory = async () => {
    const v = await storyForm.validateFields();
    await trackingApi.createStory({ project_id: projectId!, ...v });
    message.success('需求已创建');
    setStoryModalOpen(false);
    loadData();
  };

  // Event CRUD
  const handleSaveEvent = async () => {
    const v = await eventForm.validateFields();
    if (editingEvent) {
      await trackingApi.updateEvent(editingEvent.id, v);
      message.success('事件已更新');
    } else {
      await trackingApi.createEvent({ project_id: projectId!, ...v });
      message.success('事件已创建');
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
    message.success('属性已添加');
    setPropModalOpen(false);
    loadData();
  };

  const eventColumns = [
    { title: '事件名', dataIndex: 'name', key: 'name', width: 200 },
    { title: '显示名', dataIndex: 'display_name', key: 'display_name', width: 150, render: (v: string) => v || '-' },
    { title: '所属需求', key: 'story', width: 150, render: (_: any, r: EventDef) => r.story?.name || '-' },
    { title: '属性数', key: 'props', width: 80, render: (_: any, r: EventDef) => r.properties?.length || 0 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 80, render: (s: number) => <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.text}</Tag> },
    {
      title: '操作', key: 'action', width: 200,
      render: (_: any, r: EventDef) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { setEditingEvent(r); }}>详情</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditingEvent(r); eventForm.setFieldsValue(r); setEventModalOpen(true); }}>编辑</Button>
          <Popconfirm title="确认删除?" onConfirm={async () => { await trackingApi.deleteEvent(r.id); loadData(); }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'events',
          label: '事件列表',
          children: (
            <Card title="事件定义" extra={
              <Space>
                <Select allowClear placeholder="按需求筛选" style={{ width: 180 }}
                  options={stories.map(s => ({ value: s.id, label: s.name }))}
                  onChange={(v) => setSelectedStoryId(v)} />
                <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingEvent(null); eventForm.resetFields(); setEventModalOpen(true); }}>
                  新建事件
                </Button>
              </Space>
            }>
              <Table dataSource={events} columns={eventColumns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} />
            </Card>
          ),
        },
        {
          key: 'stories',
          label: '需求管理',
          children: (
            <Card title="埋点需求" extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { storyForm.resetFields(); setStoryModalOpen(true); }}>
                新建需求
              </Button>
            }>
              <Table dataSource={stories} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }}
                columns={[
                  { title: '名称', dataIndex: 'name' },
                  { title: '文档', dataIndex: 'docs_url', render: (v: string) => v ? <a href={v} target="_blank">查看</a> : '-' },
                  { title: '事件数', key: 'count', render: (_: any, r: Story) => r._count?.events || 0 },
                  { title: '状态', dataIndex: 'status', render: (s: number) => <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.text}</Tag> },
                  {
                    title: '操作', key: 'action', render: (_: any, r: Story) => (
                      <Space>
                        <Button type="link" size="small" onClick={() => { setSelectedStoryId(r.id); setActiveTab('events'); }}>查看事件</Button>
                        <Popconfirm title="确认删除?" onConfirm={async () => { await trackingApi.deleteStory(r.id); loadData(); }}>
                          <Button type="link" size="small" danger>删除</Button>
                        </Popconfirm>
                      </Space>
                    )
                  },
                ]}
              />
            </Card>
          ),
        },
      ]} />

      {/* 事件详情抽屉 */}
      <Drawer title={`事件详情: ${editingEvent?.name || ''}`} open={!!editingEvent && !eventModalOpen && !propModalOpen}
        onClose={() => setEditingEvent(null)} width={500}>
        {editingEvent && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="事件名">{editingEvent.name}</Descriptions.Item>
              <Descriptions.Item label="显示名">{editingEvent.display_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="描述">{editingEvent.description || '-'}</Descriptions.Item>
              <Descriptions.Item label="所属需求">{editingEvent.story?.name || '-'}</Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={5} style={{ margin: 0 }}>事件属性</Title>
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => { propForm.resetFields(); setPropModalOpen(true); }}>
                添加属性
              </Button>
            </div>
            <Table dataSource={editingEvent.properties || []} rowKey="id" size="small" style={{ marginTop: 8 }}
              columns={[
                { title: '属性名', dataIndex: 'name' },
                { title: '类型', dataIndex: 'data_type' },
                { title: '必填', dataIndex: 'is_required', render: (v: boolean) => v ? <Tag color="red">是</Tag> : '否' },
                {
                  title: '操作', key: 'action', render: (_: any, r: EventProperty) => (
                    <Popconfirm title="确认删除?" onConfirm={async () => { await trackingApi.deleteProperty(r.id); loadData(); }}>
                      <Button type="link" size="small" danger>删除</Button>
                    </Popconfirm>
                  )
                },
              ]}
            />
          </>
        )}
      </Drawer>

      {/* Story 弹窗 */}
      <Modal title="新建需求" open={storyModalOpen} onOk={handleSaveStory} onCancel={() => setStoryModalOpen(false)} destroyOnClose>
        <Form form={storyForm} layout="vertical">
          <Form.Item name="name" label="需求名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="docs_url" label="文档链接"><Input placeholder="可选" /></Form.Item>
        </Form>
      </Modal>

      {/* Event 弹窗 */}
      <Modal title={editingEvent ? '编辑事件' : '新建事件'} open={eventModalOpen} onOk={handleSaveEvent} onCancel={() => { setEventModalOpen(false); setEditingEvent(null); }} destroyOnClose>
        <Form form={eventForm} layout="vertical">
          <Form.Item name="name" label="事件名" rules={[{ required: true }]}><Input placeholder="例: page_view" disabled={!!editingEvent} /></Form.Item>
          <Form.Item name="display_name" label="显示名"><Input placeholder="例: 页面浏览" /></Form.Item>
          <Form.Item name="description" label="描述"><TextArea rows={2} /></Form.Item>
          <Form.Item name="story_id" label="关联需求">
            <Select allowClear placeholder="选择需求" options={stories.map(s => ({ value: s.id, label: s.name }))} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Property 弹窗 */}
      <Modal title="添加属性" open={propModalOpen} onOk={handleSaveProperty} onCancel={() => setPropModalOpen(false)} destroyOnClose>
        <Form form={propForm} layout="vertical">
          <Form.Item name="name" label="属性名" rules={[{ required: true }]}><Input placeholder="例: page_url" /></Form.Item>
          <Form.Item name="data_type" label="数据类型" rules={[{ required: true }]}>
            <Select options={[{ value: 'string', label: '字符串' }, { value: 'number', label: '数字' }, { value: 'boolean', label: '布尔' }]} />
          </Form.Item>
          <Form.Item name="is_required" label="是否必填" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="description" label="描述"><Input placeholder="可选" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

/**
 * 标签管理页
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, Tag, message, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, ReloadOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useGlobalStore } from '@/stores/global';
import { tagApi } from '@/services-new/tag';

const { TextArea } = Input;
const TAG_TYPES = [
  { value: 'condition', label: '条件标签' },
  { value: 'sql', label: 'SQL 标签' },
  { value: 'metric', label: '指标标签' },
  { value: 'times', label: '次数标签' },
  { value: 'group', label: '分组标签' },
];
const STATUS_MAP: Record<number, { color: string; text: string }> = {
  1: { color: 'green', text: '正常' },
  2: { color: 'default', text: '禁用' },
  3: { color: 'processing', text: '计算中' },
};

export default function TagsPage() {
  const currentProject = useGlobalStore((s) => s.currentProject);
  const projectId = currentProject?.id;
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try { setTags(((await tagApi.list(projectId).catch(() => [])) as any[]) || []); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    const v = await form.validateFields();
    await tagApi.create({ project_id: projectId, ...v });
    message.success('标签已创建');
    setModalOpen(false);
    loadData();
  };

  const handleRefresh = async (id: number) => {
    const result = await tagApi.refresh(id) as any;
    message.success(`计算完成，实体数: ${result.entity_count}`);
    loadData();
  };

  return (
    <Card title="标签管理" extra={<Space>
      <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>新建标签</Button>
    </Space>}>
      <Table dataSource={tags} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }}
        columns={[
          { title: '标签名', dataIndex: 'name', width: 150 },
          { title: '显示名', dataIndex: 'display_name', width: 150, render: (v: string) => v || '-' },
          { title: '类型', dataIndex: 'tag_type', width: 100, render: (t: string) => <Tag color="blue">{t}</Tag> },
          { title: '实体数', dataIndex: 'entity_count', width: 100 },
          { title: '状态', dataIndex: 'status', width: 80, render: (s: number) => <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.text}</Tag> },
          {
            title: '操作', key: 'action', width: 200, render: (_: any, r: any) => (
              <Space>
                <Tooltip title="触发计算"><Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => handleRefresh(r.id)}>计算</Button></Tooltip>
                <Popconfirm title="确认删除?" onConfirm={async () => { await tagApi.delete(r.id); loadData(); }}>
                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
              </Space>
            )
          },
        ]}
      />
      <Modal title="新建标签" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="标签名" rules={[{ required: true }]}><Input placeholder="例: high_value_user" /></Form.Item>
          <Form.Item name="display_name" label="显示名"><Input placeholder="例: 高价值用户" /></Form.Item>
          <Form.Item name="tag_type" label="类型" rules={[{ required: true }]}><Select options={TAG_TYPES} /></Form.Item>
          <Form.Item name="description" label="描述"><TextArea rows={2} /></Form.Item>
          <Form.Item name="sql_content" label="SQL 内容"><TextArea rows={3} placeholder="SELECT ..." /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

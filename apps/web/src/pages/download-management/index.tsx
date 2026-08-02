/**
 * 大文件异步导出中心页
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, Progress, Tag, message, Popconfirm, Typography } from 'antd';
import { DownloadOutlined, ReloadOutlined, PlusOutlined, DeleteOutlined, FileExcelOutlined, FileTextOutlined } from '@ant-design/icons';
import { useGlobalStore } from '@/stores/global';
import { downloadApi } from '@/services-new/v4';

const { Text } = Typography;

const STATUS_MAP: Record<number, { color: string; text: string }> = {
  1: { color: 'processing', text: '排队中' },
  2: { color: 'warning', text: '导出中' },
  3: { color: 'success', text: '已完成' },
  4: { color: 'error', text: '失败' },
};

function formatBytes(bytes: number, decimals = 2) {
  if (!bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function DownloadManagementPage() {
  const currentProject = useGlobalStore((s) => s.currentProject);
  const projectId = currentProject?.id;
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = (await downloadApi.list(projectId).catch(() => [])) as any[];
      setTasks(Array.isArray(res) ? res : []);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    const v = await form.validateFields();
    if (!projectId) return;
    const task = await downloadApi.create({
      project_id: projectId,
      task_name: v.task_name,
      task_type: v.task_type,
    });
    message.success('异步导出任务提交成功');
    setModalOpen(false);
    loadData();

    if (task && (task as any).id) {
      await downloadApi.execute((task as any).id).catch(() => null);
      loadData();
    }
  };

  const handleDelete = async (id: number) => {
    await downloadApi.delete(id);
    message.success('任务已删除');
    loadData();
  };

  return (
    <Card
      title={
        <Space>
          <FileExcelOutlined style={{ color: '#52c41a', fontSize: 20 }} />
          <span>大文件异步导出中心</span>
        </Space>
      }
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
            新建导出任务
          </Button>
        </Space>
      }
    >
      <Table
        dataSource={tasks}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 15 }}
        columns={[
          {
            title: '任务名称',
            dataIndex: 'task_name',
            width: 250,
            render: (text: string, r: any) => (
              <Space>
                {r.task_name.endsWith('.csv') ? <FileTextOutlined style={{ color: '#1890ff' }} /> : <FileExcelOutlined style={{ color: '#52c41a' }} />}
                <Text style={{ fontWeight: 'bold' }}>{text}</Text>
              </Space>
            ),
          },
          {
            title: '类型',
            dataIndex: 'task_type',
            width: 120,
            render: (type: string) => (
              <Tag color="blue">{type === 'analysis' ? '分析报表' : type === 'datatable' ? '全量明细' : '自定义查询'}</Tag>
            ),
          },
          {
            title: '进度',
            dataIndex: 'progress',
            width: 180,
            render: (val: number, r: any) => (
              <Progress percent={val} size="small" status={r.status === 4 ? 'exception' : r.status === 3 ? 'success' : 'active'} />
            ),
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: (s: number) => <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.text}</Tag>,
          },
          {
            title: '文件大小',
            dataIndex: 'file_size',
            width: 120,
            render: (size: number) => (size ? formatBytes(size) : '-'),
          },
          {
            title: '创建时间',
            dataIndex: 'created_at',
            width: 180,
            render: (d: string) => (d ? new Date(d).toLocaleString() : '-'),
          },
          {
            title: '操作',
            key: 'action',
            width: 150,
            render: (_: any, r: any) => (
              <Space>
                {r.status === 3 && r.file_url ? (
                  <Button
                    type="link"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => {
                      message.info(`正在下载文件: ${r.task_name}`);
                    }}
                  >
                    下载
                  </Button>
                ) : (
                  <Text type="secondary" style={{ fontSize: 12 }}>生成中...</Text>
                )}
                <Popconfirm title="确定删除该导出任务?" onConfirm={() => handleDelete(r.id)}>
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
        title="新建大文件异步导出任务"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="task_name" label="任务名称" rules={[{ required: true, message: '请输入导出任务名称' }]}>
            <Input placeholder="例: 2026年7月全量用户行为明细.xlsx" />
          </Form.Item>
          <Form.Item name="task_type" label="导出数据源类型" initialValue="analysis">
            <Select
              options={[
                { value: 'analysis', label: '行为分析报表数据' },
                { value: 'datatable', label: '全量事件数据表明细' },
                { value: 'report', label: '数据看板快照' },
              ]}
            />
          </Form.Item>
          <Form.Item name="format" label="目标文件格式" initialValue="xlsx">
            <Select
              options={[
                { value: 'xlsx', label: 'Excel 工作表 (.xlsx)' },
                { value: 'csv', label: '逗号分隔符文本 (.csv)' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

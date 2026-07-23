/**
 * 看板列表页 — 文件夹树 + 看板卡片
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Tree, Card, Row, Col, Button, Modal, Form, Input, Space, Typography,
  Empty, Spin, Dropdown, Tag, Tooltip, message, Breadcrumb,
} from 'antd';
import {
  PlusOutlined, FolderOutlined, DashboardOutlined,
  EditOutlined, DeleteOutlined, MoreOutlined,
  HomeOutlined, ReloadOutlined, LinkOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useGlobalStore } from '@/stores/global';
import { dashboardApi, FolderNode, DashboardItem } from '@/services-new/dashboard';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function DashboardPage() {
  const navigate = useNavigate();
  const currentProject = useGlobalStore((s) => s.currentProject);
  const projectId = currentProject?.id;

  const [loading, setLoading] = useState(false);
  const [folderTree, setFolderTree] = useState<FolderNode[]>([]);
  const [dashboards, setDashboards] = useState<DashboardItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | undefined>();
  const [expandedKeys, setExpandedKeys] = useState<number[]>([]);

  // 弹窗状态
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [dashboardModalOpen, setDashboardModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderNode | null>(null);
  const [folderForm] = Form.useForm();
  const [dashboardForm] = Form.useForm();

  // 加载数据
  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [tree, list] = await Promise.all([
        dashboardApi.getFolderTree(projectId).catch(() => []),
        dashboardApi.listDashboards(projectId, selectedFolderId).catch(() => []),
      ]);
      setFolderTree(tree || []);
      setDashboards(list || []);
      // 自动展开第一级
      if (tree?.length && !expandedKeys.length) {
        setExpandedKeys(tree.map((n: FolderNode) => n.id));
      }
    } catch (err) {
      console.error('Load dashboard data failed', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedFolderId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── 文件夹操作 ────────────────────────
  const handleCreateFolder = (parentId?: number) => {
    setEditingFolder(null);
    folderForm.resetFields();
    if (parentId) folderForm.setFieldsValue({ parent_id: parentId });
    setFolderModalOpen(true);
  };

  const handleEditFolder = (folder: FolderNode) => {
    setEditingFolder(folder);
    folderForm.setFieldsValue({ name: folder.name, parent_id: folder.parent_id });
    setFolderModalOpen(true);
  };

  const handleSaveFolder = async () => {
    const values = await folderForm.validateFields();
    if (editingFolder) {
      await dashboardApi.updateFolder(editingFolder.id, { name: values.name });
      message.success('文件夹已更新');
    } else {
      await dashboardApi.createFolder({
        project_id: projectId!,
        parent_id: values.parent_id || null,
        name: values.name,
      });
      message.success('文件夹已创建');
    }
    setFolderModalOpen(false);
    loadData();
  };

  const handleDeleteFolder = async (id: number) => {
    Modal.confirm({
      title: '确认删除？',
      content: '删除文件夹将同时删除其下所有看板',
      onOk: async () => {
        await dashboardApi.deleteFolder(id);
        message.success('已删除');
        if (selectedFolderId === id) setSelectedFolderId(undefined);
        loadData();
      },
    });
  };

  // ─── 看板操作 ──────────────────────────
  const handleCreateDashboard = () => {
    dashboardForm.resetFields();
    if (selectedFolderId) dashboardForm.setFieldsValue({ folder_id: selectedFolderId });
    setDashboardModalOpen(true);
  };

  const handleSaveDashboard = async () => {
    const values = await dashboardForm.validateFields();
    await dashboardApi.createDashboard({
      project_id: projectId!,
      folder_id: values.folder_id || null,
      name: values.name,
      description: values.description,
    });
    message.success('看板已创建');
    setDashboardModalOpen(false);
    loadData();
  };

  const handleDeleteDashboard = (id: number, name: string) => {
    Modal.confirm({
      title: `确认归档看板「${name}」？`,
      onOk: async () => {
        await dashboardApi.deleteDashboard(id);
        message.success('已归档');
        loadData();
      },
    });
  };

  // ─── 文件夹树数据转换 ──────────────────
  const treeData = folderTree.map((node) => buildTreeNode(node));

  function buildTreeNode(node: FolderNode): any {
    return {
      key: node.id,
      title: (
        <Space>
          <FolderOutlined />
          <span>{node.name}</span>
          {node.dashboards?.length ? (
            <Text type="secondary" style={{ fontSize: 12 }}>({node.dashboards.length})</Text>
          ) : null}
        </Space>
      ),
      children: node.children?.map(buildTreeNode),
    };
  }

  // ─── 面包屑 ──────────────────────────
  const breadcrumbItems = [
    { title: <><HomeOutlined /> 看板</> },
    ...(selectedFolderId ? [{ title: '当前文件夹' }] : []),
  ];

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      {/* ─── 左侧：文件夹树 ─── */}
      <div style={{
        width: 260, flexShrink: 0, borderRight: '1px solid #f0f0f0',
        paddingRight: 16, overflow: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text strong>文件夹</Text>
          <Space size={4}>
            <Tooltip title="新建文件夹">
              <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => handleCreateFolder()} />
            </Tooltip>
            <Tooltip title="刷新">
              <Button type="text" size="small" icon={<ReloadOutlined />} onClick={loadData} />
            </Tooltip>
          </Space>
        </div>

        <div
          style={{ cursor: 'pointer', padding: '6px 8px', borderRadius: 6, marginBottom: 4, background: !selectedFolderId ? '#e6f4ff' : 'transparent' }}
          onClick={() => setSelectedFolderId(undefined)}
        >
          <HomeOutlined style={{ marginRight: 8 }} />
          <span>全部看板</span>
        </div>

        {folderTree.length > 0 ? (
          <Tree
            treeData={treeData}
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys as number[])}
            selectedKeys={selectedFolderId ? [selectedFolderId] : []}
            onSelect={(keys) => setSelectedFolderId(keys[0] as number || undefined)}
            titleRender={(nodeData: any) => (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span>{nodeData.title}</span>
                <Dropdown
                  menu={{
                    items: [
                      { key: 'edit', label: '重命名', icon: <EditOutlined />, onClick: () => handleEditFolder(folderTree.find(f => f.id === nodeData.key)!) },
                      { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true, onClick: () => handleDeleteFolder(nodeData.key) },
                    ],
                  }}
                  trigger={['click']}
                >
                  <Button type="text" size="small" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
                </Dropdown>
              </div>
            )}
            blockNode
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无文件夹" style={{ marginTop: 40 }} />
        )}
      </div>

      {/* ─── 右侧：看板列表 ─── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 16 }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            {selectedFolderId ? '文件夹看板' : '全部看板'}
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateDashboard}>
            新建看板
          </Button>
        </div>

        <Spin spinning={loading}>
          {dashboards.length > 0 ? (
            <Row gutter={[16, 16]}>
              {dashboards.map((d) => (
                <Col key={d.id} xs={24} sm={12} lg={8} xl={6}>
                  <Card
                    hoverable
                    onClick={() => navigate(`/dashboard/${d.id}`)}
                    actions={[
                      <Tooltip title="编辑" key="edit"><EditOutlined /></Tooltip>,
                      <Tooltip title="分享" key="share"><LinkOutlined /></Tooltip>,
                      <Tooltip title="归档" key="del"><DeleteOutlined onClick={(e) => { e.stopPropagation(); handleDeleteDashboard(d.id, d.name); }} /></Tooltip>,
                    ]}
                  >
                    <Card.Meta
                      avatar={<DashboardOutlined style={{ fontSize: 24, color: '#1677ff' }} />}
                      title={d.name}
                      description={
                        <Paragraph ellipsis={{ rows: 2 }} type="secondary" style={{ marginBottom: 0, minHeight: 44 }}>
                          {d.description || '暂无描述'}
                        </Paragraph>
                      }
                    />
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Tag color={d.status === 1 ? 'green' : 'default'}>
                        {d.status === 1 ? '正常' : '已归档'}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(d.updated_at).format('MM-DD HH:mm')}
                      </Text>
                    </div>
                    {d.reports && d.reports.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {d.reports.length} 个报表
                        </Text>
                      </div>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <Empty description="暂无看板" style={{ marginTop: 80 }}>
              <Button type="primary" onClick={handleCreateDashboard}>创建第一个看板</Button>
            </Empty>
          )}
        </Spin>
      </div>

      {/* ─── 文件夹弹窗 ─── */}
      <Modal
        title={editingFolder ? '重命名文件夹' : '新建文件夹'}
        open={folderModalOpen}
        onOk={handleSaveFolder}
        onCancel={() => setFolderModalOpen(false)}
        destroyOnClose
      >
        <Form form={folderForm} layout="vertical">
          <Form.Item name="name" label="文件夹名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="输入文件夹名称" maxLength={100} />
          </Form.Item>
          <Form.Item name="parent_id" label="父文件夹 ID" hidden>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* ─── 看板弹窗 ─── */}
      <Modal
        title="新建看板"
        open={dashboardModalOpen}
        onOk={handleSaveDashboard}
        onCancel={() => setDashboardModalOpen(false)}
        destroyOnClose
      >
        <Form form={dashboardForm} layout="vertical">
          <Form.Item name="name" label="看板名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="输入看板名称" maxLength={200} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea placeholder="看板描述（可选）" rows={3} maxLength={500} />
          </Form.Item>
          <Form.Item name="folder_id" label="文件夹 ID" hidden>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

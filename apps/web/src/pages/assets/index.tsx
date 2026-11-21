import {
  type AttributeItem,
  type CategoryItem,
  type DataTableItem,
  type DatasetItem,
  type ImpactAnalysisResult,
  type LineageGraph,
  type LineageNode,
  type ProjectQualityOverview,
  type TableQualityProfile,
  type UpstreamProvenanceResult,
  attributeApi,
  categoryApi,
  datasetApi,
  lineageApi,
  qualityApi,
  tableApi,
} from '@/services/asset';
import { useGlobalStore } from '@/stores/global';
import {
  AlertOutlined,
  ApartmentOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  NodeIndexOutlined,
  PlusOutlined,
  RadarChartOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  message,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';

const { TextArea } = Input;

const STATUS_MAP: Record<number, { color: string; text: string }> = {
  1: { color: 'green', text: '启用' },
  2: { color: 'default', text: '禁用' },
};

const TABLE_TYPE_MAP: Record<string, string> = {
  event: '事件表',
  user: '用户表',
  upload: '上传表',
};

const DATASET_TYPE_MAP: Record<string, string> = {
  sql: 'SQL 数据集',
  relation: '关联数据集',
  option: '选项数据集',
};

const GRADE_COLOR_MAP: Record<string, string> = {
  'A+': '#52c41a',
  A: '#1890ff',
  B: '#faad14',
  C: '#fa8c16',
  D: '#f5222d',
};

const RISK_COLOR_MAP: Record<string, string> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'error',
  CRITICAL: 'magenta',
};

export default function AssetsPage() {
  const currentProject = useGlobalStore((s) => s.currentProject);
  const projectId = currentProject?.id;
  const [activeTab, setActiveTab] = useState('tables');
  const [loading, setLoading] = useState(false);

  // 数据表
  const [tables, setTables] = useState<DataTableItem[]>([]);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<DataTableItem | null>(null);
  const [tableDetail, setTableDetail] = useState<DataTableItem | null>(null);
  const [tableForm] = Form.useForm();

  // 数据集
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [datasetModalOpen, setDatasetModalOpen] = useState(false);
  const [editingDataset, setEditingDataset] = useState<DatasetItem | null>(null);
  const [datasetForm] = Form.useForm();

  // 属性
  const [attributes, setAttributes] = useState<AttributeItem[]>([]);
  const [attrModalOpen, setAttrModalOpen] = useState(false);
  const [attrForm] = Form.useForm();

  // 分类
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catForm] = Form.useForm();

  // 全链路血缘
  const [lineageGraph, setLineageGraph] = useState<LineageGraph | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [impactResult, setImpactResult] = useState<ImpactAnalysisResult | null>(null);
  const [provenanceResult, setProvenanceResult] = useState<UpstreamProvenanceResult | null>(null);
  const [lineageLoading, setLineageLoading] = useState(false);

  // 数据质量巡检
  const [qualityOverview, setQualityOverview] = useState<ProjectQualityOverview | null>(null);
  const [tableQualityDetail, setTableQualityDetail] = useState<TableQualityProfile | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [t, d, a, c] = await Promise.all([
        tableApi.list(projectId).catch(() => []),
        datasetApi.list(projectId).catch(() => []),
        attributeApi.list(projectId).catch(() => []),
        categoryApi.list(projectId).catch(() => []),
      ]);
      setTables(t || []);
      setDatasets(d || []);
      setAttributes(a || []);
      setCategories(c || []);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadLineage = useCallback(async () => {
    if (!projectId) return;
    setLineageLoading(true);
    try {
      const graph = await lineageApi.getGraph(projectId);
      setLineageGraph(graph);
      if (graph.nodes.length > 0 && !selectedNodeId && graph.nodes[0]) {
        setSelectedNodeId(graph.nodes[0].id);
      }
    } catch {
      message.error('加载血缘图谱失败');
    } finally {
      setLineageLoading(false);
    }
  }, [projectId, selectedNodeId]);

  const loadQuality = useCallback(async () => {
    if (!projectId) return;
    setQualityLoading(true);
    try {
      const q = await qualityApi.getOverview(projectId);
      setQualityOverview(q);
    } catch {
      message.error('加载数据质量概况失败');
    } finally {
      setQualityLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === 'lineage') {
      loadLineage();
    } else if (activeTab === 'quality') {
      loadQuality();
    }
  }, [activeTab, loadLineage, loadQuality]);

  // ─── 血缘影响面 / 溯源触发 ───
  const handleRunImpactAnalysis = async () => {
    if (!selectedNodeId) {
      message.warning('请先选择一个血缘节点');
      return;
    }
    setLineageLoading(true);
    try {
      const [impact, prov] = await Promise.all([
        lineageApi.getImpact(selectedNodeId),
        lineageApi.getProvenance(selectedNodeId),
      ]);
      setImpactResult(impact);
      setProvenanceResult(prov);
      message.success('影响面与根因溯源解析完成');
    } catch {
      message.error('解析影响面失败');
    } finally {
      setLineageLoading(false);
    }
  };

  // ─── 触发全库质量体检 ───
  const handleRunQualityScan = async () => {
    if (!projectId) return;
    setQualityLoading(true);
    try {
      const res = await qualityApi.scanQuality(projectId);
      setQualityOverview(res);
      message.success('全库数据质量巡检已完成');
    } catch {
      message.error('质量体检失败');
    } finally {
      setQualityLoading(false);
    }
  };

  // ─── 查看单表质量明细 ───
  const handleShowTableQuality = async (tableId: number) => {
    try {
      const detail = await qualityApi.getTableQuality(tableId);
      setTableQualityDetail(detail);
    } catch {
      message.error('获取表质量明细失败');
    }
  };

  // ─── 数据表操作 ───
  const handleSaveTable = async () => {
    const v = await tableForm.validateFields();
    if (editingTable) {
      await tableApi.update(editingTable.id, v);
      message.success('更新成功');
    } else {
      await tableApi.create({ project_id: projectId!, ...v });
      message.success('创建成功');
    }
    setTableModalOpen(false);
    setEditingTable(null);
    loadData();
  };

  const showTableDetail = async (record: DataTableItem) => {
    const detail = await tableApi.get(record.id);
    setTableDetail(detail);
  };

  // ─── 数据集操作 ───
  const handleSaveDataset = async () => {
    const v = await datasetForm.validateFields();
    if (editingDataset) {
      await datasetApi.update(editingDataset.id, v);
      message.success('更新成功');
    } else {
      await datasetApi.create({ project_id: projectId!, ...v });
      message.success('创建成功');
    }
    setDatasetModalOpen(false);
    setEditingDataset(null);
    loadData();
  };

  // ─── 属性操作 ───
  const handleSaveAttr = async () => {
    const v = await attrForm.validateFields();
    await attributeApi.create({ project_id: projectId!, ...v });
    message.success('创建成功');
    setAttrModalOpen(false);
    loadData();
  };

  // ─── 分类操作 ───
  const handleSaveCat = async () => {
    const v = await catForm.validateFields();
    await categoryApi.create({ project_id: projectId!, ...v });
    message.success('创建成功');
    setCatModalOpen(false);
    loadData();
  };

  const tableColumns = [
    { title: '表名', dataIndex: 'name', key: 'name', width: 200 },
    {
      title: '显示名',
      dataIndex: 'display_name',
      key: 'display_name',
      width: 150,
      render: (v: string) => v || '-',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (v: string) => <Tag>{TABLE_TYPE_MAP[v] || v}</Tag>,
    },
    {
      title: '字段数',
      key: 'columns',
      width: 80,
      render: (_: any, r: DataTableItem) => r._count?.columns || r.columns?.length || 0,
    },
    {
      title: '行数',
      dataIndex: 'row_count',
      key: 'row_count',
      width: 100,
      render: (v: number) => v?.toLocaleString() || '0',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (s: number) => <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.text}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, r: DataTableItem) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => showTableDetail(r)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingTable(r);
              tableForm.setFieldsValue(r);
              setTableModalOpen(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除?"
            onConfirm={async () => {
              await tableApi.delete(r.id);
              loadData();
            }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const datasetColumns = [
    { title: '名称', dataIndex: 'name', key: 'name', width: 200 },
    {
      title: '显示名',
      dataIndex: 'display_name',
      key: 'display_name',
      width: 150,
      render: (v: string) => v || '-',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (v: string) => <Tag color="blue">{DATASET_TYPE_MAP[v] || v}</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (s: number) => <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.text}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, r: DatasetItem) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingDataset(r);
              datasetForm.setFieldsValue(r);
              setDatasetModalOpen(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除?"
            onConfirm={async () => {
              await datasetApi.delete(r.id);
              loadData();
            }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const attrColumns = [
    { title: '属性名', dataIndex: 'name', key: 'name', width: 200 },
    {
      title: '显示名',
      dataIndex: 'display_name',
      key: 'display_name',
      width: 150,
      render: (v: string) => v || '-',
    },
    { title: '数据类型', dataIndex: 'data_type', key: 'data_type', width: 100 },
    {
      title: '实体类型',
      dataIndex: 'entity_type',
      key: 'entity_type',
      width: 120,
      render: (v: string) => v || '-',
    },
    {
      title: '维度',
      dataIndex: 'is_dimension',
      key: 'is_dimension',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="blue">是</Tag> : '否'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (s: number) => <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.text}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, r: AttributeItem) => (
        <Popconfirm
          title="确认删除?"
          onConfirm={async () => {
            await attributeApi.delete(r.id);
            loadData();
          }}
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const catColumns = [
    { title: '分类名', dataIndex: 'name', key: 'name', width: 200 },
    { title: '类型', dataIndex: 'type', key: 'type', width: 120 },
    { title: '层级', dataIndex: 'level', key: 'level', width: 80 },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, r: CategoryItem) => (
        <Popconfirm
          title="确认删除?"
          onConfirm={async () => {
            await categoryApi.delete(r.id);
            loadData();
          }}
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'tables',
            label: '数据表',
            children: (
              <Card
                title="数据表管理"
                extra={
                  <Space>
                    <Button icon={<ReloadOutlined />} onClick={loadData}>
                      刷新
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setEditingTable(null);
                        tableForm.resetFields();
                        setTableModalOpen(true);
                      }}
                    >
                      新建数据表
                    </Button>
                  </Space>
                }
              >
                <Table
                  dataSource={tables}
                  columns={tableColumns}
                  rowKey="id"
                  loading={loading}
                  size="small"
                  pagination={{ pageSize: 20 }}
                />
              </Card>
            ),
          },
          {
            key: 'datasets',
            label: '数据集',
            children: (
              <Card
                title="数据集管理"
                extra={
                  <Space>
                    <Button icon={<ReloadOutlined />} onClick={loadData}>
                      刷新
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setEditingDataset(null);
                        datasetForm.resetFields();
                        setDatasetModalOpen(true);
                      }}
                    >
                      新建数据集
                    </Button>
                  </Space>
                }
              >
                <Table
                  dataSource={datasets}
                  columns={datasetColumns}
                  rowKey="id"
                  loading={loading}
                  size="small"
                  pagination={{ pageSize: 20 }}
                />
              </Card>
            ),
          },
          {
            key: 'attributes',
            label: '属性管理',
            children: (
              <Card
                title="属性管理"
                extra={
                  <Space>
                    <Button icon={<ReloadOutlined />} onClick={loadData}>
                      刷新
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        attrForm.resetFields();
                        setAttrModalOpen(true);
                      }}
                    >
                      新建属性
                    </Button>
                  </Space>
                }
              >
                <Table
                  dataSource={attributes}
                  columns={attrColumns}
                  rowKey="id"
                  loading={loading}
                  size="small"
                  pagination={{ pageSize: 20 }}
                />
              </Card>
            ),
          },
          {
            key: 'categories',
            label: '分类管理',
            children: (
              <Card
                title="分类管理"
                extra={
                  <Space>
                    <Button icon={<ReloadOutlined />} onClick={loadData}>
                      刷新
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        catForm.resetFields();
                        setCatModalOpen(true);
                      }}
                    >
                      新建分类
                    </Button>
                  </Space>
                }
              >
                <Table
                  dataSource={categories}
                  columns={catColumns}
                  rowKey="id"
                  loading={loading}
                  size="small"
                  pagination={{ pageSize: 20 }}
                />
              </Card>
            ),
          },
          {
            key: 'lineage',
            label: (
              <span>
                <ApartmentOutlined /> 全链路血缘图谱
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[16, 16]}>
                  <Col span={4}>
                    <Card size="small">
                      <Statistic
                        title="源数据表"
                        value={lineageGraph?.summary.tableCount || 0}
                        prefix={<ApartmentOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col span={4}>
                    <Card size="small">
                      <Statistic
                        title="转换数据集"
                        value={lineageGraph?.summary.datasetCount || 0}
                        prefix={<NodeIndexOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col span={4}>
                    <Card size="small">
                      <Statistic
                        title="核心业务指标"
                        value={lineageGraph?.summary.metricCount || 0}
                        prefix={<RadarChartOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col span={4}>
                    <Card size="small">
                      <Statistic
                        title="BI 看板与报表"
                        value={lineageGraph?.summary.dashboardCount || 0}
                        prefix={<CheckCircleOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col span={4}>
                    <Card size="small">
                      <Statistic
                        title="监控预警规则"
                        value={lineageGraph?.summary.warningCount || 0}
                        prefix={<AlertOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col span={4}>
                    <Card size="small">
                      <Statistic
                        title="血缘拓扑连接数"
                        value={lineageGraph?.summary.totalEdges || 0}
                      />
                    </Card>
                  </Col>
                </Row>

                <Card
                  title="血缘节点分析与爆炸半径评估"
                  extra={
                    <Space>
                      <Button
                        icon={<ReloadOutlined />}
                        loading={lineageLoading}
                        onClick={loadLineage}
                      >
                        刷新血缘
                      </Button>
                    </Space>
                  }
                >
                  <Space direction="horizontal" size="middle" style={{ marginBottom: 20 }}>
                    <span style={{ fontWeight: 500 }}>目标血缘节点:</span>
                    <Select
                      style={{ width: 320 }}
                      value={selectedNodeId}
                      onChange={setSelectedNodeId}
                      placeholder="选择节点进行上下游链路追踪"
                      options={(lineageGraph?.nodes || []).map((n) => ({
                        value: n.id,
                        label: `[${n.type}] ${n.displayName} (${n.name})`,
                      }))}
                    />
                    <Button
                      type="primary"
                      icon={<NodeIndexOutlined />}
                      onClick={handleRunImpactAnalysis}
                      loading={lineageLoading}
                    >
                      向下影响面分析 & 向上溯源
                    </Button>
                  </Space>

                  {impactResult && (
                    <div style={{ marginTop: 12 }}>
                      <Alert
                        type={
                          impactResult.summary.riskLevel === 'CRITICAL' ||
                          impactResult.summary.riskLevel === 'HIGH'
                            ? 'warning'
                            : 'info'
                        }
                        showIcon
                        message={
                          <Space>
                            <span>
                              当前节点变更影响风险等级:{' '}
                              <Tag color={RISK_COLOR_MAP[impactResult.summary.riskLevel]}>
                                {impactResult.summary.riskLevel}
                              </Tag>
                            </span>
                            <span>
                              直接/间接波及下游资产:{' '}
                              <strong>{impactResult.summary.totalImpacted}</strong> 个
                            </span>
                            <span>
                              影响看板: {impactResult.summary.affectedDashboards} 个 | 影响指标:{' '}
                              {impactResult.summary.affectedMetrics} 个
                            </span>
                          </Space>
                        }
                        style={{ marginBottom: 16 }}
                      />

                      <Row gutter={16}>
                        <Col span={12}>
                          <Card
                            size="small"
                            title="下游波及路径 (Blast Radius Timeline)"
                            style={{ background: '#fafafa' }}
                          >
                            {impactResult.impactedNodes.length === 0 ? (
                              <div style={{ color: '#8c8c8c' }}>
                                该节点为最末端节点，无下游依赖受波及。
                              </div>
                            ) : (
                              <Timeline
                                items={impactResult.impactedNodes.map((item) => ({
                                  color: item.node.type === 'DASHBOARD' ? 'red' : 'blue',
                                  children: (
                                    <div>
                                      <strong>
                                        [第 {item.depth} 层] {item.node.displayName}
                                      </strong>
                                      <Tag style={{ marginLeft: 8 }}>{item.node.type}</Tag>
                                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                                        传播路径: {item.path.join(' ➔ ')}
                                      </div>
                                    </div>
                                  ),
                                }))}
                              />
                            )}
                          </Card>
                        </Col>

                        <Col span={12}>
                          <Card
                            size="small"
                            title="向上溯源全貌 (Upstream Provenance)"
                            style={{ background: '#fafafa' }}
                          >
                            {provenanceResult && provenanceResult.upstreamNodes.length > 0 ? (
                              <Timeline
                                items={provenanceResult.upstreamNodes.map((item) => ({
                                  color: item.node.type === 'TABLE' ? 'green' : 'orange',
                                  children: (
                                    <div>
                                      <strong>
                                        [上游 {item.depth} 层] {item.node.displayName}
                                      </strong>
                                      <Tag style={{ marginLeft: 8 }}>{item.node.type}</Tag>
                                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                                        数据源溯源链: {item.path.join(' ➔ ')}
                                      </div>
                                    </div>
                                  ),
                                }))}
                              />
                            ) : (
                              <div style={{ color: '#8c8c8c' }}>
                                当前节点为根源数据表 (无需上溯数据源)。
                              </div>
                            )}
                          </Card>
                        </Col>
                      </Row>
                    </div>
                  )}

                  <div style={{ marginTop: 24 }}>
                    <h4>全链路血缘拓扑表 (Lineage Graph Nodes & Topology)</h4>
                    <Table
                      dataSource={lineageGraph?.nodes || []}
                      rowKey="id"
                      size="small"
                      columns={[
                        {
                          title: '节点标识',
                          dataIndex: 'id',
                          key: 'id',
                          width: 140,
                        },
                        {
                          title: '类型',
                          dataIndex: 'type',
                          key: 'type',
                          width: 120,
                          render: (t: string) => {
                            let color = 'default';
                            if (t === 'TABLE') color = 'green';
                            if (t === 'DATASET') color = 'cyan';
                            if (t === 'METRIC') color = 'blue';
                            if (t === 'DASHBOARD') color = 'purple';
                            if (t === 'WARNING') color = 'red';
                            return <Tag color={color}>{t}</Tag>;
                          },
                        },
                        {
                          title: '资产名称',
                          dataIndex: 'displayName',
                          key: 'displayName',
                          render: (v: string, r: LineageNode) => (
                            <Space>
                              <strong>{v}</strong>
                              <span style={{ color: '#8c8c8c', fontSize: 12 }}>({r.name})</span>
                            </Space>
                          ),
                        },
                        {
                          title: '元数据摘要',
                          key: 'meta',
                          render: (_: any, r: LineageNode) => (
                            <Space size={4}>
                              {r.meta?.rowCount !== undefined && (
                                <Tag>行数: {r.meta.rowCount.toLocaleString()}</Tag>
                              )}
                              {r.meta?.type && <Tag>格式: {r.meta.type}</Tag>}
                            </Space>
                          ),
                        },
                        {
                          title: '操作',
                          key: 'op',
                          width: 120,
                          render: (_: any, r: LineageNode) => (
                            <Button
                              type="link"
                              size="small"
                              onClick={() => {
                                setSelectedNodeId(r.id);
                                handleRunImpactAnalysis();
                              }}
                            >
                              分析影响面
                            </Button>
                          ),
                        },
                      ]}
                      pagination={{ pageSize: 10 }}
                    />
                  </div>
                </Card>
              </div>
            ),
          },
          {
            key: 'quality',
            label: (
              <span>
                <RadarChartOutlined /> 数据质量巡检
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[16, 16]}>
                  <Col span={6}>
                    <Card size="small">
                      <Statistic
                        title="综合数据资产健康分"
                        value={qualityOverview?.avgHealthScore || 0}
                        suffix="/ 100"
                        valueStyle={{
                          color:
                            (qualityOverview?.avgHealthScore || 0) >= 80 ? '#3f8600' : '#cf1322',
                        }}
                        prefix={<CheckCircleOutlined />}
                      />
                      <Progress
                        percent={qualityOverview?.avgHealthScore || 0}
                        status={
                          (qualityOverview?.avgHealthScore || 0) >= 80 ? 'success' : 'exception'
                        }
                        showInfo={false}
                        style={{ marginTop: 8 }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small">
                      <Statistic
                        title="优质资产表数 (Grade A+/A)"
                        value={qualityOverview?.healthyTableCount || 0}
                        valueStyle={{ color: '#1890ff' }}
                        prefix={<CheckCircleOutlined />}
                      />
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 8 }}>
                        健康评分 ≥ 80 分
                      </div>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small">
                      <Statistic
                        title="待整改风险表数"
                        value={qualityOverview?.atRiskTableCount || 0}
                        valueStyle={{ color: '#fa8c16' }}
                        prefix={<WarningOutlined />}
                      />
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 8 }}>
                        缺失中文注释 / 长期未更新
                      </div>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small">
                      <Statistic
                        title="纳管字段总数"
                        value={qualityOverview?.totalColumns || 0}
                        prefix={<ApartmentOutlined />}
                      />
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 8 }}>
                        评估覆盖率 100%
                      </div>
                    </Card>
                  </Col>
                </Row>

                <Card
                  title="全库数据表质量全景评估"
                  extra={
                    <Space>
                      <Button
                        type="primary"
                        icon={<RadarChartOutlined />}
                        loading={qualityLoading}
                        onClick={handleRunQualityScan}
                      >
                        一键全库质量体检
                      </Button>
                      <Button
                        icon={<ReloadOutlined />}
                        loading={qualityLoading}
                        onClick={loadQuality}
                      >
                        刷新
                      </Button>
                    </Space>
                  }
                >
                  <Table
                    dataSource={qualityOverview?.tables || []}
                    rowKey="tableId"
                    loading={qualityLoading}
                    size="small"
                    columns={[
                      {
                        title: '表名',
                        dataIndex: 'tableName',
                        key: 'tableName',
                        width: 180,
                        render: (v: string, r) => (
                          <div>
                            <strong>{v}</strong>
                            {r.displayName && (
                              <div style={{ fontSize: 12, color: '#8c8c8c' }}>{r.displayName}</div>
                            )}
                          </div>
                        ),
                      },
                      {
                        title: '类型',
                        dataIndex: 'tableType',
                        key: 'tableType',
                        width: 90,
                        render: (t: string) => <Tag>{TABLE_TYPE_MAP[t] || t}</Tag>,
                      },
                      {
                        title: '健康评级',
                        dataIndex: 'grade',
                        key: 'grade',
                        width: 100,
                        render: (g: string) => (
                          <Tag
                            color={GRADE_COLOR_MAP[g] || 'default'}
                            style={{ fontWeight: 'bold' }}
                          >
                            Grade {g}
                          </Tag>
                        ),
                      },
                      {
                        title: '综合健康分',
                        dataIndex: 'healthScore',
                        key: 'healthScore',
                        width: 140,
                        render: (s: number) => (
                          <div style={{ width: 100 }}>
                            <Progress
                              percent={s}
                              size="small"
                              format={(percent) => `${percent}分`}
                              status={s >= 80 ? 'success' : s >= 60 ? 'normal' : 'exception'}
                            />
                          </div>
                        ),
                      },
                      {
                        title: '完整度',
                        dataIndex: 'completenessScore',
                        key: 'completenessScore',
                        width: 90,
                        render: (v: number) => `${v}%`,
                      },
                      {
                        title: '鲜活度',
                        dataIndex: 'freshnessScore',
                        key: 'freshnessScore',
                        width: 90,
                        render: (v: number) => `${v}%`,
                      },
                      {
                        title: '规范度',
                        dataIndex: 'validityScore',
                        key: 'validityScore',
                        width: 90,
                        render: (v: number) => `${v}%`,
                      },
                      {
                        title: '质量异常诊断',
                        dataIndex: 'anomalies',
                        key: 'anomalies',
                        render: (anoms: string[]) => (
                          <Space size={[0, 4]} wrap>
                            {anoms.length === 0 ? (
                              <Tag color="success">标准合规</Tag>
                            ) : (
                              anoms.map((a) => (
                                <Tag color="warning" key={a} icon={<WarningOutlined />}>
                                  {a}
                                </Tag>
                              ))
                            )}
                          </Space>
                        ),
                      },
                      {
                        title: '操作',
                        key: 'op',
                        width: 100,
                        render: (_: any, r) => (
                          <Button
                            type="link"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleShowTableQuality(r.tableId)}
                          >
                            体检明细
                          </Button>
                        ),
                      },
                    ]}
                    pagination={{ pageSize: 10 }}
                  />
                </Card>
              </div>
            ),
          },
        ]}
      />

      {/* 单表质量诊断报告抽屉 */}
      <Drawer
        title={`数据表质量深度体检: ${tableQualityDetail?.tableName || ''}`}
        open={!!tableQualityDetail}
        onClose={() => setTableQualityDetail(null)}
        width={720}
      >
        {tableQualityDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="数据表名">{tableQualityDetail.tableName}</Descriptions.Item>
              <Descriptions.Item label="中文显示名">
                {tableQualityDetail.displayName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="健康评级">
                <Tag
                  color={GRADE_COLOR_MAP[tableQualityDetail.grade]}
                  style={{ fontWeight: 'bold' }}
                >
                  Grade {tableQualityDetail.grade}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="健康评分">
                <strong style={{ fontSize: 16 }}>{tableQualityDetail.healthScore} 分</strong>
              </Descriptions.Item>
              <Descriptions.Item label="字段总数">
                {tableQualityDetail.columnCount} 个字段
              </Descriptions.Item>
              <Descriptions.Item label="有效记录行数">
                {tableQualityDetail.rowCount.toLocaleString()} 行
              </Descriptions.Item>
              <Descriptions.Item label="最近维护时间" span={2}>
                {new Date(tableQualityDetail.updatedAt).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            <h4>字段级元数据健康体检 (Column Metadata Profiling)</h4>
            <Table
              dataSource={tableQualityDetail.columns || []}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: '字段名', dataIndex: 'name', key: 'name', width: 140 },
                {
                  title: '显示名',
                  dataIndex: 'displayName',
                  key: 'displayName',
                  width: 120,
                  render: (v: string) => v || <span style={{ color: '#bfbfbf' }}>未配置</span>,
                },
                { title: '数据类型', dataIndex: 'dataType', key: 'dataType', width: 100 },
                {
                  title: '主维度',
                  dataIndex: 'isDimension',
                  key: 'isDimension',
                  width: 70,
                  render: (v: boolean) => (v ? <Tag color="blue">是</Tag> : '否'),
                },
                {
                  title: '质检结论',
                  key: 'qualityStatus',
                  render: (_: any, col) => (
                    <div>
                      <Badge
                        status={
                          col.qualityStatus === 'GOOD'
                            ? 'success'
                            : col.qualityStatus === 'WARNING'
                              ? 'warning'
                              : 'error'
                        }
                        text={col.qualityStatus}
                      />
                      {col.issueDescription && (
                        <div style={{ fontSize: 12, color: '#fa8c16' }}>{col.issueDescription}</div>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Drawer>

      {/* 数据表详情抽屉 */}
      <Drawer
        title={`数据表详情: ${tableDetail?.name || ''}`}
        open={!!tableDetail}
        onClose={() => setTableDetail(null)}
        width={600}
      >
        {tableDetail && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="表名">{tableDetail.name}</Descriptions.Item>
              <Descriptions.Item label="显示名">
                {tableDetail.display_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="类型">
                <Tag>{TABLE_TYPE_MAP[tableDetail.type] || tableDetail.type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="描述">{tableDetail.description || '-'}</Descriptions.Item>
              <Descriptions.Item label="行数">
                {tableDetail.row_count?.toLocaleString() || '0'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_MAP[tableDetail.status]?.color}>
                  {STATUS_MAP[tableDetail.status]?.text}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            <h4 style={{ marginTop: 24, marginBottom: 12 }}>
              字段列表 ({tableDetail.columns?.length || 0})
            </h4>
            <Table
              dataSource={tableDetail.columns || []}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: '字段名', dataIndex: 'name', key: 'name' },
                { title: '类型', dataIndex: 'data_type', key: 'data_type', width: 100 },
                {
                  title: '维度',
                  dataIndex: 'is_dimension',
                  key: 'is_dimension',
                  width: 60,
                  render: (v: boolean) => (v ? '是' : '否'),
                },
                {
                  title: '描述',
                  dataIndex: 'description',
                  key: 'description',
                  render: (v: string) => v || '-',
                },
              ]}
            />
          </>
        )}
      </Drawer>

      {/* 数据表弹窗 */}
      <Modal
        title={editingTable ? '编辑数据表' : '新建数据表'}
        open={tableModalOpen}
        onOk={handleSaveTable}
        onCancel={() => {
          setTableModalOpen(false);
          setEditingTable(null);
        }}
        destroyOnClose
      >
        <Form form={tableForm} layout="vertical">
          <Form.Item name="name" label="表名" rules={[{ required: true }]}>
            <Input placeholder="例: events" disabled={!!editingTable} />
          </Form.Item>
          <Form.Item name="display_name" label="显示名">
            <Input placeholder="例: 事件表" />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'event', label: '事件表' },
                { value: 'user', label: '用户表' },
                { value: 'upload', label: '上传表' },
              ]}
              disabled={!!editingTable}
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 数据集弹窗 */}
      <Modal
        title={editingDataset ? '编辑数据集' : '新建数据集'}
        open={datasetModalOpen}
        onOk={handleSaveDataset}
        onCancel={() => {
          setDatasetModalOpen(false);
          setEditingDataset(null);
        }}
        destroyOnClose
        width={600}
      >
        <Form form={datasetForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="例: daily_active_users" />
          </Form.Item>
          <Form.Item name="display_name" label="显示名">
            <Input placeholder="例: 日活用户" />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'sql', label: 'SQL 数据集' },
                { value: 'relation', label: '关联数据集' },
                { value: 'option', label: '选项数据集' },
              ]}
              disabled={!!editingDataset}
            />
          </Form.Item>
          <Form.Item name="sql_content" label="SQL 内容">
            <TextArea rows={4} placeholder="SELECT * FROM events WHERE ..." />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 属性弹窗 */}
      <Modal
        title="新建属性"
        open={attrModalOpen}
        onOk={handleSaveAttr}
        onCancel={() => setAttrModalOpen(false)}
        destroyOnClose
      >
        <Form form={attrForm} layout="vertical">
          <Form.Item name="name" label="属性名" rules={[{ required: true }]}>
            <Input placeholder="例: user_age" />
          </Form.Item>
          <Form.Item name="display_name" label="显示名">
            <Input placeholder="例: 用户年龄" />
          </Form.Item>
          <Form.Item name="data_type" label="数据类型" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'string', label: '字符串' },
                { value: 'number', label: '数字' },
                { value: 'date', label: '日期' },
                { value: 'boolean', label: '布尔' },
              ]}
            />
          </Form.Item>
          <Form.Item name="entity_type" label="实体类型">
            <Input placeholder="例: user / event" />
          </Form.Item>
          <Form.Item name="is_dimension" label="是否维度" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* 分类弹窗 */}
      <Modal
        title="新建分类"
        open={catModalOpen}
        onOk={handleSaveCat}
        onCancel={() => setCatModalOpen(false)}
        destroyOnClose
      >
        <Form form={catForm} layout="vertical">
          <Form.Item name="name" label="分类名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Input placeholder="例: attribute / table" />
          </Form.Item>
          <Form.Item name="parent_id" label="父分类 ID">
            <Input type="number" placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

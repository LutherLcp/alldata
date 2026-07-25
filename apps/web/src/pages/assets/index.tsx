/**
 * 数据资产页 — 数据表/数据集/属性/分类 Tab 管理
 */
import { useEffect, useState, useCallback } from 'react';
import {
    Card, Table, Button, Space, Modal, Form, Input, Select, Tag, Tabs,
    Popconfirm, message, Drawer, Descriptions, Switch,
} from 'antd';
import {
    PlusOutlined, ReloadOutlined, DeleteOutlined, EyeOutlined, EditOutlined,
} from '@ant-design/icons';
import { useGlobalStore } from '@/stores/global';
import {
    tableApi, datasetApi, attributeApi, categoryApi,
    DataTableItem, DatasetItem, AttributeItem, CategoryItem,
} from '@/services-new/asset';

const { TextArea } = Input;

const STATUS_MAP: Record<number, { color: string; text: string }> = {
    1: { color: 'green', text: '启用' },
    2: { color: 'default', text: '禁用' },
};

const TABLE_TYPE_MAP: Record<string, string> = {
    event: '事件表', user: '用户表', upload: '上传表',
};

const DATASET_TYPE_MAP: Record<string, string> = {
    sql: 'SQL 数据集', relation: '关联数据集', option: '选项数据集',
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

    useEffect(() => { loadData(); }, [loadData]);

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
        { title: '显示名', dataIndex: 'display_name', key: 'display_name', width: 150, render: (v: string) => v || '-' },
        { title: '类型', dataIndex: 'type', key: 'type', width: 100, render: (v: string) => <Tag>{TABLE_TYPE_MAP[v] || v}</Tag> },
        { title: '字段数', key: 'columns', width: 80, render: (_: any, r: DataTableItem) => r._count?.columns || r.columns?.length || 0 },
        { title: '行数', dataIndex: 'row_count', key: 'row_count', width: 100, render: (v: number) => v?.toLocaleString() || '0' },
        { title: '状态', dataIndex: 'status', key: 'status', width: 80, render: (s: number) => <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.text}</Tag> },
        {
            title: '操作', key: 'action', width: 200,
            render: (_: any, r: DataTableItem) => (
                <Space>
                    <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => showTableDetail(r)}>详情</Button>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditingTable(r); tableForm.setFieldsValue(r); setTableModalOpen(true); }}>编辑</Button>
                    <Popconfirm title="确认删除?" onConfirm={async () => { await tableApi.delete(r.id); loadData(); }}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const datasetColumns = [
        { title: '名称', dataIndex: 'name', key: 'name', width: 200 },
        { title: '显示名', dataIndex: 'display_name', key: 'display_name', width: 150, render: (v: string) => v || '-' },
        { title: '类型', dataIndex: 'type', key: 'type', width: 120, render: (v: string) => <Tag color="blue">{DATASET_TYPE_MAP[v] || v}</Tag> },
        { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true, render: (v: string) => v || '-' },
        { title: '状态', dataIndex: 'status', key: 'status', width: 80, render: (s: number) => <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.text}</Tag> },
        {
            title: '操作', key: 'action', width: 150,
            render: (_: any, r: DatasetItem) => (
                <Space>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditingDataset(r); datasetForm.setFieldsValue(r); setDatasetModalOpen(true); }}>编辑</Button>
                    <Popconfirm title="确认删除?" onConfirm={async () => { await datasetApi.delete(r.id); loadData(); }}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const attrColumns = [
        { title: '属性名', dataIndex: 'name', key: 'name', width: 200 },
        { title: '显示名', dataIndex: 'display_name', key: 'display_name', width: 150, render: (v: string) => v || '-' },
        { title: '数据类型', dataIndex: 'data_type', key: 'data_type', width: 100 },
        { title: '实体类型', dataIndex: 'entity_type', key: 'entity_type', width: 120, render: (v: string) => v || '-' },
        { title: '维度', dataIndex: 'is_dimension', key: 'is_dimension', width: 80, render: (v: boolean) => v ? <Tag color="blue">是</Tag> : '否' },
        { title: '状态', dataIndex: 'status', key: 'status', width: 80, render: (s: number) => <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.text}</Tag> },
        {
            title: '操作', key: 'action', width: 120,
            render: (_: any, r: AttributeItem) => (
                <Popconfirm title="确认删除?" onConfirm={async () => { await attributeApi.delete(r.id); loadData(); }}>
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
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
            title: '操作', key: 'action', width: 120,
            render: (_: any, r: CategoryItem) => (
                <Popconfirm title="确认删除?" onConfirm={async () => { await categoryApi.delete(r.id); loadData(); }}>
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <div>
            <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
                {
                    key: 'tables',
                    label: '数据表',
                    children: (
                        <Card title="数据表管理" extra={
                            <Space>
                                <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
                                <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingTable(null); tableForm.resetFields(); setTableModalOpen(true); }}>新建数据表</Button>
                            </Space>
                        }>
                            <Table dataSource={tables} columns={tableColumns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} />
                        </Card>
                    ),
                },
                {
                    key: 'datasets',
                    label: '数据集',
                    children: (
                        <Card title="数据集管理" extra={
                            <Space>
                                <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
                                <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingDataset(null); datasetForm.resetFields(); setDatasetModalOpen(true); }}>新建数据集</Button>
                            </Space>
                        }>
                            <Table dataSource={datasets} columns={datasetColumns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} />
                        </Card>
                    ),
                },
                {
                    key: 'attributes',
                    label: '属性管理',
                    children: (
                        <Card title="属性管理" extra={
                            <Space>
                                <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
                                <Button type="primary" icon={<PlusOutlined />} onClick={() => { attrForm.resetFields(); setAttrModalOpen(true); }}>新建属性</Button>
                            </Space>
                        }>
                            <Table dataSource={attributes} columns={attrColumns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} />
                        </Card>
                    ),
                },
                {
                    key: 'categories',
                    label: '分类管理',
                    children: (
                        <Card title="分类管理" extra={
                            <Space>
                                <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
                                <Button type="primary" icon={<PlusOutlined />} onClick={() => { catForm.resetFields(); setCatModalOpen(true); }}>新建分类</Button>
                            </Space>
                        }>
                            <Table dataSource={categories} columns={catColumns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} />
                        </Card>
                    ),
                },
            ]} />

            {/* 数据表详情抽屉 */}
            <Drawer title={`数据表详情: ${tableDetail?.name || ''}`} open={!!tableDetail}
                onClose={() => setTableDetail(null)} width={600}>
                {tableDetail && (
                    <>
                        <Descriptions column={1} size="small" bordered>
                            <Descriptions.Item label="表名">{tableDetail.name}</Descriptions.Item>
                            <Descriptions.Item label="显示名">{tableDetail.display_name || '-'}</Descriptions.Item>
                            <Descriptions.Item label="类型"><Tag>{TABLE_TYPE_MAP[tableDetail.type] || tableDetail.type}</Tag></Descriptions.Item>
                            <Descriptions.Item label="描述">{tableDetail.description || '-'}</Descriptions.Item>
                            <Descriptions.Item label="行数">{tableDetail.row_count?.toLocaleString() || '0'}</Descriptions.Item>
                            <Descriptions.Item label="状态"><Tag color={STATUS_MAP[tableDetail.status]?.color}>{STATUS_MAP[tableDetail.status]?.text}</Tag></Descriptions.Item>
                        </Descriptions>
                        <h4 style={{ marginTop: 24, marginBottom: 12 }}>字段列表 ({tableDetail.columns?.length || 0})</h4>
                        <Table dataSource={tableDetail.columns || []} rowKey="id" size="small" pagination={false}
                            columns={[
                                { title: '字段名', dataIndex: 'name', key: 'name' },
                                { title: '类型', dataIndex: 'data_type', key: 'data_type', width: 100 },
                                { title: '维度', dataIndex: 'is_dimension', key: 'is_dimension', width: 60, render: (v: boolean) => v ? '是' : '否' },
                                { title: '描述', dataIndex: 'description', key: 'description', render: (v: string) => v || '-' },
                            ]}
                        />
                    </>
                )}
            </Drawer>

            {/* 数据表弹窗 */}
            <Modal title={editingTable ? '编辑数据表' : '新建数据表'} open={tableModalOpen}
                onOk={handleSaveTable} onCancel={() => { setTableModalOpen(false); setEditingTable(null); }} destroyOnClose>
                <Form form={tableForm} layout="vertical">
                    <Form.Item name="name" label="表名" rules={[{ required: true }]}><Input placeholder="例: events" disabled={!!editingTable} /></Form.Item>
                    <Form.Item name="display_name" label="显示名"><Input placeholder="例: 事件表" /></Form.Item>
                    <Form.Item name="type" label="类型" rules={[{ required: true }]}>
                        <Select options={[{ value: 'event', label: '事件表' }, { value: 'user', label: '用户表' }, { value: 'upload', label: '上传表' }]} disabled={!!editingTable} />
                    </Form.Item>
                    <Form.Item name="description" label="描述"><TextArea rows={2} /></Form.Item>
                </Form>
            </Modal>

            {/* 数据集弹窗 */}
            <Modal title={editingDataset ? '编辑数据集' : '新建数据集'} open={datasetModalOpen}
                onOk={handleSaveDataset} onCancel={() => { setDatasetModalOpen(false); setEditingDataset(null); }} destroyOnClose width={600}>
                <Form form={datasetForm} layout="vertical">
                    <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input placeholder="例: daily_active_users" /></Form.Item>
                    <Form.Item name="display_name" label="显示名"><Input placeholder="例: 日活用户" /></Form.Item>
                    <Form.Item name="type" label="类型" rules={[{ required: true }]}>
                        <Select options={[{ value: 'sql', label: 'SQL 数据集' }, { value: 'relation', label: '关联数据集' }, { value: 'option', label: '选项数据集' }]} disabled={!!editingDataset} />
                    </Form.Item>
                    <Form.Item name="sql_content" label="SQL 内容"><TextArea rows={4} placeholder="SELECT * FROM events WHERE ..." /></Form.Item>
                    <Form.Item name="description" label="描述"><TextArea rows={2} /></Form.Item>
                </Form>
            </Modal>

            {/* 属性弹窗 */}
            <Modal title="新建属性" open={attrModalOpen} onOk={handleSaveAttr} onCancel={() => setAttrModalOpen(false)} destroyOnClose>
                <Form form={attrForm} layout="vertical">
                    <Form.Item name="name" label="属性名" rules={[{ required: true }]}><Input placeholder="例: user_age" /></Form.Item>
                    <Form.Item name="display_name" label="显示名"><Input placeholder="例: 用户年龄" /></Form.Item>
                    <Form.Item name="data_type" label="数据类型" rules={[{ required: true }]}>
                        <Select options={[{ value: 'string', label: '字符串' }, { value: 'number', label: '数字' }, { value: 'date', label: '日期' }, { value: 'boolean', label: '布尔' }]} />
                    </Form.Item>
                    <Form.Item name="entity_type" label="实体类型"><Input placeholder="例: user / event" /></Form.Item>
                    <Form.Item name="is_dimension" label="是否维度" valuePropName="checked"><Switch /></Form.Item>
                    <Form.Item name="description" label="描述"><Input /></Form.Item>
                </Form>
            </Modal>

            {/* 分类弹窗 */}
            <Modal title="新建分类" open={catModalOpen} onOk={handleSaveCat} onCancel={() => setCatModalOpen(false)} destroyOnClose>
                <Form form={catForm} layout="vertical">
                    <Form.Item name="name" label="分类名" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="type" label="类型" rules={[{ required: true }]}><Input placeholder="例: attribute / table" /></Form.Item>
                    <Form.Item name="parent_id" label="父分类 ID"><Input type="number" placeholder="可选" /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

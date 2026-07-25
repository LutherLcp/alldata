/**
 * 版本日历页 — 日历列表 + CRUD
 */
import { useEffect, useState, useCallback } from 'react';
import {
    Card, Table, Button, Space, Modal, Form, Input, Select, Tag,
    DatePicker, Popconfirm, message, Statistic, Row, Col,
} from 'antd';
import {
    PlusOutlined, ReloadOutlined, DeleteOutlined, EditOutlined, CalendarOutlined,
} from '@ant-design/icons';
import { useGlobalStore } from '@/stores/global';
import { calendarApi, CalendarItem } from '@/services-new/calendar';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

const STATUS_MAP: Record<number, { color: string; text: string }> = {
    1: { color: 'green', text: '正常' },
    2: { color: 'default', text: '已取消' },
};

const TYPE_OPTIONS = [
    { value: 'release', label: '版本发布' },
    { value: 'milestone', label: '里程碑' },
    { value: 'maintenance', label: '维护窗口' },
    { value: 'meeting', label: '会议' },
    { value: 'other', label: '其他' },
];

const TYPE_MAP: Record<string, string> = Object.fromEntries(TYPE_OPTIONS.map((t) => [t.value, t.label]));

export default function CalendarPage() {
    const currentProject = useGlobalStore((s) => s.currentProject);
    const projectId = currentProject?.id;

    const [items, setItems] = useState<CalendarItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<CalendarItem | null>(null);
    const [form] = Form.useForm();

    const loadData = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const list = await calendarApi.list(projectId);
            setItems(list || []);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async () => {
        const v = await form.validateFields();
        const data = {
            ...v,
            start_date: v.dateRange[0].format('YYYY-MM-DD'),
            end_date: v.dateRange[1]?.format('YYYY-MM-DD') || undefined,
        };
        delete data.dateRange;

        if (editing) {
            await calendarApi.update(editing.id, data);
            message.success('更新成功');
        } else {
            await calendarApi.create({ project_id: projectId!, ...data });
            message.success('创建成功');
        }
        setModalOpen(false);
        setEditing(null);
        loadData();
    };

    const columns = [
        { title: '标题', dataIndex: 'title', key: 'title', width: 250 },
        { title: '类型', dataIndex: 'type', key: 'type', width: 120, render: (v: string) => <Tag color="blue">{TYPE_MAP[v] || v}</Tag> },
        {
            title: '开始日期', dataIndex: 'start_date', key: 'start_date', width: 120,
            render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '-',
        },
        {
            title: '结束日期', dataIndex: 'end_date', key: 'end_date', width: 120,
            render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '-',
        },
        { title: '状态', dataIndex: 'status', key: 'status', width: 80, render: (s: number) => <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.text}</Tag> },
        { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true, render: (v: string) => v || '-' },
        {
            title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180,
            render: (v: string) => new Date(v).toLocaleString(),
        },
        {
            title: '操作', key: 'action', width: 180,
            render: (_: any, r: CalendarItem) => (
                <Space>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
                        setEditing(r);
                        form.setFieldsValue({
                            ...r,
                            dateRange: r.start_date && r.end_date
                                ? [dayjs(r.start_date), dayjs(r.end_date)]
                                : r.start_date ? [dayjs(r.start_date)] : undefined,
                        });
                        setModalOpen(true);
                    }}>编辑</Button>
                    <Popconfirm title="确认删除?" onConfirm={async () => { await calendarApi.delete(r.id); loadData(); }}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}><Card size="small"><Statistic title="日历事件总数" value={items.length} prefix={<CalendarOutlined />} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="即将到来" value={items.filter((i) => dayjs(i.start_date).isAfter(dayjs())).length} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="版本发布" value={items.filter((i) => i.type === 'release').length} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="里程碑" value={items.filter((i) => i.type === 'milestone').length} /></Card></Col>
            </Row>

            <Card title="版本日历" extra={
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>新建事件</Button>
                </Space>
            }>
                <Table dataSource={items} columns={columns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} />
            </Card>

            <Modal title={editing ? '编辑日历事件' : '新建日历事件'} open={modalOpen}
                onOk={handleSave} onCancel={() => { setModalOpen(false); setEditing(null); }} destroyOnClose width={600}>
                <Form form={form} layout="vertical">
                    <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input placeholder="例: V3.0 版本发布" /></Form.Item>
                    <Form.Item name="type" label="类型" rules={[{ required: true }]}>
                        <Select options={TYPE_OPTIONS} />
                    </Form.Item>
                    <Form.Item name="dateRange" label="日期范围" rules={[{ required: true }]}>
                        <RangePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="status" label="状态" initialValue={1}>
                        <Select options={[{ value: 1, label: '正常' }, { value: 2, label: '已取消' }]} />
                    </Form.Item>
                    <Form.Item name="description" label="描述"><TextArea rows={3} placeholder="版本说明、变更内容..." /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

/**
 * 用户分析页 — 用户列表 + 详情 + 行为时间线
 */
import { useEffect, useState, useCallback } from 'react';
import {
    Card, Table, Button, Space, Input, Select, Tag, Avatar, Drawer,
    Descriptions, Timeline, Popconfirm, message, Statistic, Row, Col,
} from 'antd';
import {
    ReloadOutlined, SearchOutlined, UserOutlined, CheckCircleOutlined,
    StopOutlined, EyeOutlined,
} from '@ant-design/icons';
import { useGlobalStore } from '@/stores/global';
import { userApi, UserItem, UserTimelineEvent } from '@/services-new/user';

const STATUS_MAP: Record<number, { color: string; text: string }> = {
    1: { color: 'green', text: '启用' },
    2: { color: 'red', text: '禁用' },
};

export default function UsersPage() {
    const currentProject = useGlobalStore((s) => s.currentProject);
    const projectId = currentProject?.id;

    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState<number | undefined>();
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const [detailUser, setDetailUser] = useState<UserItem | null>(null);
    const [timeline, setTimeline] = useState<UserTimelineEvent[]>([]);
    const [timelineLoading, setTimelineLoading] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await userApi.list({ keyword, status: statusFilter, page, page_size: pageSize });
            setUsers(res?.list || []);
            setTotal(res?.page_info?.total || 0);
        } catch {
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, [keyword, statusFilter, page, pageSize]);

    useEffect(() => { loadData(); }, [loadData]);

    const showDetail = async (record: UserItem) => {
        setDetailUser(record);
        if (projectId) {
            setTimelineLoading(true);
            try {
                const tl = await userApi.getTimeline(record.id, projectId);
                setTimeline(tl || []);
            } catch {
                setTimeline([]);
            } finally {
                setTimelineLoading(false);
            }
        }
    };

    const handleToggleStatus = async (record: UserItem) => {
        const newStatus = record.status === 1 ? 2 : 1;
        await userApi.updateStatus(record.id, newStatus);
        message.success(newStatus === 1 ? '已启用' : '已禁用');
        loadData();
    };

    const columns = [
        {
            title: '用户', dataIndex: 'username', key: 'username', width: 200,
            render: (v: string, r: UserItem) => (
                <Space>
                    <Avatar size="small" icon={<UserOutlined />} src={r.avatar || undefined} />
                    <span>{v}</span>
                </Space>
            ),
        },
        { title: '邮箱', dataIndex: 'email', key: 'email', width: 220, render: (v: string) => v || '-' },
        {
            title: '状态', dataIndex: 'status', key: 'status', width: 80,
            render: (s: number) => <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.text}</Tag>,
        },
        { title: '语言', dataIndex: 'lang', key: 'lang', width: 80 },
        { title: '登录方式', dataIndex: 'login_method', key: 'login_method', width: 100 },
        {
            title: '所属项目', key: 'projects', width: 200,
            render: (_: any, r: UserItem) => r.project_roles?.map((pr) => (
                <Tag key={pr.project.id}>{pr.project.name}</Tag>
            )) || '-',
        },
        {
            title: '注册时间', dataIndex: 'created_at', key: 'created_at', width: 180,
            render: (v: string) => new Date(v).toLocaleString(),
        },
        {
            title: '操作', key: 'action', width: 180,
            render: (_: any, r: UserItem) => (
                <Space>
                    <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => showDetail(r)}>详情</Button>
                    <Popconfirm title={`确认${r.status === 1 ? '禁用' : '启用'}?`} onConfirm={() => handleToggleStatus(r)}>
                        <Button type="link" size="small" danger={r.status === 1}
                            icon={r.status === 1 ? <StopOutlined /> : <CheckCircleOutlined />}>
                            {r.status === 1 ? '禁用' : '启用'}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}><Card size="small"><Statistic title="总用户数" value={total} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="启用用户" value={users.filter((u) => u.status === 1).length} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="当前页" value={page} suffix={`/ ${Math.ceil(total / pageSize) || 1}`} /></Card></Col>
                <Col span={6}><Card size="small"><Statistic title="每页条数" value={pageSize} /></Card></Col>
            </Row>

            <Card title="用户列表" extra={
                <Space>
                    <Input.Search placeholder="搜索用户名/邮箱" allowClear style={{ width: 220 }}
                        value={keyword} onChange={(e) => setKeyword(e.target.value)} onSearch={() => { setPage(1); loadData(); }}
                        prefix={<SearchOutlined />} />
                    <Select allowClear placeholder="状态筛选" style={{ width: 120 }}
                        value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }}
                        options={[{ value: 1, label: '启用' }, { value: 2, label: '禁用' }]} />
                    <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
                </Space>
            }>
                <Table dataSource={users} columns={columns} rowKey="id" loading={loading} size="small"
                    pagination={{
                        current: page, pageSize, total,
                        showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
                        onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                    }}
                />
            </Card>

            <Drawer title={`用户详情: ${detailUser?.username || ''}`} open={!!detailUser}
                onClose={() => setDetailUser(null)} width={600}>
                {detailUser && (
                    <>
                        <Descriptions column={1} size="small" bordered>
                            <Descriptions.Item label="用户名">{detailUser.username}</Descriptions.Item>
                            <Descriptions.Item label="邮箱">{detailUser.email || '-'}</Descriptions.Item>
                            <Descriptions.Item label="状态">
                                <Tag color={STATUS_MAP[detailUser.status]?.color}>{STATUS_MAP[detailUser.status]?.text}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="语言">{detailUser.lang}</Descriptions.Item>
                            <Descriptions.Item label="登录方式">{detailUser.login_method}</Descriptions.Item>
                            <Descriptions.Item label="注册时间">{new Date(detailUser.created_at).toLocaleString()}</Descriptions.Item>
                            <Descriptions.Item label="所属项目">
                                {detailUser.project_roles?.map((pr) => (
                                    <Tag key={pr.project.id}>{pr.project.name} ({pr.role.name})</Tag>
                                )) || '无'}
                            </Descriptions.Item>
                        </Descriptions>

                        <h4 style={{ marginTop: 24, marginBottom: 12 }}>行为时间线</h4>
                        {timelineLoading ? (
                            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>加载中...</div>
                        ) : timeline.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无行为数据</div>
                        ) : (
                            <Timeline items={timeline.map((t, i) => ({
                                key: i,
                                color: t.event === 'login' ? 'green' : 'blue',
                                children: (
                                    <div>
                                        <div><strong>{t.event}</strong></div>
                                        <div style={{ fontSize: 12, color: '#999' }}>{new Date(t.timestamp).toLocaleString()}</div>
                                        {Object.keys(t.properties).length > 0 && (
                                            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                                                {Object.entries(t.properties).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}
                                            </div>
                                        )}
                                    </div>
                                ),
                            }))} />
                        )}
                    </>
                )}
            </Drawer>
        </div>
    );
}

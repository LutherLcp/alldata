/**
 * 看板详情页 — 报表渲染 + react-grid-layout 拖拽布局
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Button, Space, Typography, Tag, Modal, message, Empty, Breadcrumb, Tooltip } from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, SaveOutlined, CloseOutlined,
  PlusOutlined, ShareAltOutlined, DashboardOutlined,
} from '@ant-design/icons';
import { Responsive, WidthProvider, Layout, Layouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { dashboardApi, DashboardItem, ReportItem } from '@/services-new/dashboard';
import ReportCard from './components/ReportCard';

const ReactGridLayout = WidthProvider(Responsive);
const { Title, Text } = Typography;

export default function DashboardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dashboardId = Number(id);

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardItem | null>(null);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [layouts, setLayouts] = useState<Layouts>({});
  const [editMode, setEditMode] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!dashboardId) return;
    setLoading(true);
    try {
      const data = await dashboardApi.getDashboard(dashboardId);
      if (data) {
        setDashboard(data);
        setReports((data.reports || []) as any[]);
        // 从 config 恢复布局
        const savedLayouts = (data.config as any)?.layouts;
        if (savedLayouts) {
          setLayouts(savedLayouts);
        } else {
          // 默认自动布局
          setLayouts(generateDefaultLayouts((data.reports || []) as any[]));
        }
      }
    } catch (err) {
      message.error('加载看板失败');
    } finally {
      setLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // 生成默认布局
  function generateDefaultLayouts(reports: ReportItem[]): Layouts {
    const items: Layout[] = reports.map((r, idx) => ({
      i: String(r.id),
      x: (idx % 2) * 6,
      y: Math.floor(idx / 2) * 4,
      w: 6,
      h: 4,
      minW: 3,
      minH: 2,
    }));
    return { lg: items };
  }

  // 布局变化
  const handleLayoutChange = (_layout: Layout[], allLayouts: Layouts) => {
    if (editMode) {
      setLayouts(allLayouts);
    }
  };

  // 保存布局
  const handleSaveLayout = async () => {
    if (!dashboard) return;
    await dashboardApi.updateDashboard(dashboard.id, {
      config: { ...((dashboard.config as any) || {}), layouts },
    } as any);
    message.success('布局已保存');
    setEditMode(false);
  };

  // 删除报表
  const handleRemoveReport = async (reportId: number) => {
    Modal.confirm({
      title: '确认删除此报表？',
      onOk: async () => {
        await dashboardApi.deleteReport(reportId);
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        message.success('已删除');
      },
    });
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  }

  if (!dashboard) {
    return <Empty description="看板不存在" style={{ marginTop: 100 }} />;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ─── 顶部操作栏 ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Breadcrumb items={[
            { title: <><DashboardOutlined /> 看板</>, onClick: () => navigate('/dashboard'), className: 'cursor-pointer' },
            { title: dashboard.name },
          ]} />
          <Title level={4} style={{ margin: '8px 0 0' }}>
            {dashboard.name}
            <Tag color={dashboard.status === 1 ? 'green' : 'default'} style={{ marginLeft: 8 }}>
              {dashboard.status === 1 ? '正常' : '已归档'}
            </Tag>
          </Title>
          {dashboard.description && <Text type="secondary">{dashboard.description}</Text>}
        </div>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}>返回</Button>
          <Tooltip title="分享链接">
            <Button icon={<ShareAltOutlined />} onClick={async () => {
              const link = await dashboardApi.createSoftLink({ dashboard_id: dashboard.id, name: '分享链接' });
              message.success(`分享链接已创建: ${(link as any)?.token}`);
            }}>分享</Button>
          </Tooltip>
          {editMode ? (
            <>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveLayout}>保存布局</Button>
              <Button icon={<CloseOutlined />} onClick={() => setEditMode(false)}>取消</Button>
            </>
          ) : (
            <Button icon={<EditOutlined />} onClick={() => setEditMode(true)}>编辑布局</Button>
          )}
        </Space>
      </div>

      {/* ─── 报表网格 ─── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {reports.length > 0 ? (
          <ReactGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={80}
            isDraggable={editMode}
            isResizable={editMode}
            onLayoutChange={handleLayoutChange}
            margin={[16, 16]}
          >
            {reports.map((report) => (
              <div key={String(report.id)} style={{ height: '100%' }}>
                <ReportCard
                  report={report}
                  editMode={editMode}
                  onRemove={() => handleRemoveReport(report.id)}
                />
              </div>
            ))}
          </ReactGridLayout>
        ) : (
          <Empty description="暂无报表，点击编辑添加报表" style={{ marginTop: 100 }}>
            {editMode && (
              <Button type="primary" icon={<PlusOutlined />}>添加报表</Button>
            )}
          </Empty>
        )}
      </div>
    </div>
  );
}

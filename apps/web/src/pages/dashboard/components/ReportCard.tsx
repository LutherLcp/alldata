import { dashboardApi } from '@/services/dashboard';
import {
  BarChartOutlined,
  DeleteOutlined,
  EditOutlined,
  LineChartOutlined,
  MoreOutlined,
  PieChartOutlined,
  TableOutlined,
} from '@ant-design/icons';
/**
 * 报表卡片组件 — 在看板详情中渲染单个报表
 */
import { Button, Card, Dropdown, Spin, Statistic, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';

const { Text } = Typography;

interface ReportCardProps {
  report: any;
  editMode: boolean;
  onRemove: () => void;
}

const chartIconMap: Record<string, React.ReactNode> = {
  bar: <BarChartOutlined />,
  line: <LineChartOutlined />,
  pie: <PieChartOutlined />,
  table: <TableOutlined />,
};

export default function ReportCard({ report, editMode, onRemove }: ReportCardProps) {
  const chartType = report.chart_type || 'bar';
  const icon = chartIconMap[chartType] || <BarChartOutlined />;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let active = true;
    const fetchCardData = async () => {
      if (!report.id) return;
      setLoading(true);
      try {
        const res = (await dashboardApi.queryReportData(report.id)) as any;
        if (active && res) {
          setData(res.data);
        }
      } catch {
        // 允许降级展示
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchCardData();
    return () => {
      active = false;
    };
  }, [report.id]);

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin size="small" />
        </div>
      );
    }

    if (!data) {
      return (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fafafa',
            borderRadius: 4,
            color: '#bbb',
            fontSize: 14,
          }}
        >
          {report.query_config && Object.keys(report.query_config).length > 0
            ? '图表渲染中'
            : '暂无数据'}
        </div>
      );
    }

    // 语义指标卡展现
    if (report.type === 'metric' || chartType === 'number' || data.kind === 'semantic_metric') {
      const metricDef = data.metrics?.[0];
      const alias = metricDef?.alias || 'val';
      const latestRow = data.rows?.[data.rows.length - 1];
      const value = latestRow ? (latestRow[alias] ?? 0) : (data.summary?.total ?? 0);

      return (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #f0f5ff 0%, #ffffff 100%)',
            borderRadius: 6,
            padding: 16,
          }}
        >
          <Statistic
            title={metricDef?.name || report.name}
            value={Number(value)}
            valueStyle={{ color: '#1677ff', fontWeight: 600, fontSize: 28 }}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
            统一指标语义层实时计算 · {data.dimensions?.[0] || '实时'}
          </div>
        </div>
      );
    }

    // 基础图表/汇总指标展现
    const summary = data.summary || { total: 0, avg: 0, latest: 0 };
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#fafafa',
          borderRadius: 6,
          padding: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-around', margin: 'auto 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#888' }}>总计</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#262626' }}>{summary.total}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#888' }}>均值</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#52c41a' }}>{summary.avg}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#888' }}>最新</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1677ff' }}>{summary.latest}</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#aaa', textAlign: 'center' }}>
          {data.categories?.slice(0, 5).join(' · ')} ...
        </div>
      </div>
    );
  };

  return (
    <Card
      size="small"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon}
          <Text ellipsis style={{ maxWidth: 200 }}>
            {report.name}
          </Text>
          <Tag color="blue" style={{ marginLeft: 'auto' }}>
            {report.type}
          </Tag>
        </div>
      }
      extra={
        editMode ? (
          <Dropdown
            menu={{
              items: [
                { key: 'edit', label: '编辑', icon: <EditOutlined /> },
                {
                  key: 'delete',
                  label: '移除',
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: onRemove,
                },
              ],
            }}
            trigger={['click']}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        ) : null
      }
    >
      {renderContent()}
    </Card>
  );
}

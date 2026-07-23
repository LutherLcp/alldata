/**
 * 报表卡片组件 — 在看板详情中渲染单个报表
 */
import { Card, Tag, Typography, Dropdown, Button } from 'antd';
import {
  BarChartOutlined, LineChartOutlined, PieChartOutlined,
  TableOutlined, MoreOutlined, DeleteOutlined, EditOutlined,
} from '@ant-design/icons';

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

  return (
    <Card
      size="small"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon}
          <Text ellipsis style={{ maxWidth: 200 }}>{report.name}</Text>
          <Tag color="blue" style={{ marginLeft: 'auto' }}>{report.type}</Tag>
        </div>
      }
      extra={
        editMode ? (
          <Dropdown
            menu={{
              items: [
                { key: 'edit', label: '编辑', icon: <EditOutlined /> },
                { key: 'delete', label: '移除', icon: <DeleteOutlined />, danger: true, onClick: onRemove },
              ],
            }}
            trigger={['click']}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        ) : null
      }
    >
      {/* 报表内容区域 — V2.3 将实现真实图表渲染 */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fafafa', borderRadius: 4, color: '#bbb', fontSize: 14,
      }}>
        {report.query_config && Object.keys(report.query_config).length > 0
          ? '图表渲染区'
          : '暂无数据'}
      </div>
    </Card>
  );
}

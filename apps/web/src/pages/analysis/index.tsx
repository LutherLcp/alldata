/**
 * 分析页 — 6 种分析类型（事件/漏斗/留存/分布/路径/归因）
 */
import { useState } from 'react';
import {
  Card, Form, Input, Select, Button, Space, Row, Col, DatePicker,
  Radio, Tag, Typography, Spin, Empty, Statistic, Table, message,
} from 'antd';
import { SearchOutlined, StopOutlined } from '@ant-design/icons';
import { useGlobalStore } from '@/stores/global';
import { analysisApi, AnalysisQuery, AnalysisResult, AnalysisType } from '@/services-new/analysis';
import ChartSet from '@/components/common/ChartSet';
import dayjs from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const ANALYSIS_TYPES: Array<{ value: AnalysisType; label: string; color: string }> = [
  { value: 'event', label: '事件分析', color: 'blue' },
  { value: 'funnel', label: '漏斗分析', color: 'green' },
  { value: 'retention', label: '留存分析', color: 'orange' },
  { value: 'distribution', label: '分布分析', color: 'purple' },
  { value: 'path', label: '路径分析', color: 'cyan' },
  { value: 'attribute', label: '归因分析', color: 'red' },
];

const METRIC_OPTIONS = [
  { value: 'count', label: '触发次数' },
  { value: 'uv', label: '独立用户数 (UV)' },
  { value: 'pv', label: '页面浏览量 (PV)' },
];

const GRANULARITY_OPTIONS = [
  { value: 'hour', label: '小时' },
  { value: 'day', label: '天' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
];

export default function AnalysisPage() {
  const currentProject = useGlobalStore((s) => s.currentProject);
  const projectId = currentProject?.id;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('event');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'pie' | 'area'>('line');
  const [queryId, setQueryId] = useState<string | null>(null);

  const handleQuery = async () => {
    const values = await form.validateFields();
    if (!projectId) return message.warning('请先选择项目');

    const query: AnalysisQuery = {
      type: analysisType,
      project_id: projectId,
      event_name: values.event_name,
      metrics: (values.metrics || ['count']).map((m: string) => ({ type: m as any })),
      dimensions: values.dimensions || [],
      filters: values.filters || [],
      time_range: {
        start: values.dateRange[0].format('YYYY-MM-DD'),
        end: values.dateRange[1].format('YYYY-MM-DD'),
        granularity: values.granularity || 'day',
      },
      limit: values.limit || 1000,
      // 漏斗专用
      funnel_events: values.funnel_events?.split(',').map((s: string) => s.trim()),
      // 留存专用
      retention_event: values.retention_event,
      // 归因专用
      target_event: values.target_event,
    };

    setLoading(true);
    try {
      const data = await analysisApi.runQuery(query);
      setResult(data);
      setQueryId(data.query_id);
      message.success(`查询完成，耗时 ${data.elapsed_ms}ms`);
    } catch (err) {
      message.error('查询失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!queryId) return;
    await analysisApi.cancelQuery(queryId);
    message.info('已取消查询');
    setLoading(false);
  };

  // ─── 漏斗结果渲染 ───
  const renderFunnelResult = (r: AnalysisResult) => {
    const columns = [
      { title: '步骤', dataIndex: 'step', key: 'step', width: 80 },
      { title: '事件', dataIndex: 'event', key: 'event' },
      { title: '用户数', dataIndex: 'count', key: 'count', render: (v: number) => v.toLocaleString() },
      { title: '转化率', dataIndex: 'rate', key: 'rate', render: (v: number) => `${v}%` },
    ];
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Statistic title="整体转化率" value={r.total_conversion} suffix="%" />
        <Table dataSource={r.steps} columns={columns} rowKey="step" size="small" pagination={false} />
      </Space>
    );
  };

  // ─── 留存结果渲染 ───
  const renderRetentionResult = (r: AnalysisResult) => {
    const maxDays = Math.max(...(r.matrix?.map(m => m.retention_rates.length) || [1]));
    const columns = [
      { title: '日期', dataIndex: 'date', key: 'date', width: 120 },
      { title: '基础用户', dataIndex: 'base_users', key: 'base_users', render: (v: number) => v.toLocaleString() },
      ...Array.from({ length: maxDays }, (_, i) => ({
        title: `Day ${i}`,
        key: `day${i}`,
        width: 80,
        render: (_: any, record: any) => {
          const rate = record.retention_rates[i];
          if (rate === undefined) return '-';
          const color = i === 0 ? '#52c41a' : rate > 50 ? '#1890ff' : rate > 20 ? '#faad14' : '#ff4d4f';
          return <span style={{ color, fontWeight: i === 0 ? 'bold' : 'normal' }}>{rate}%</span>;
        },
      })),
    ];
    return <Table dataSource={r.matrix} columns={columns} rowKey="date" size="small" pagination={false} scroll={{ x: 200 + maxDays * 80 }} />;
  };

  // ─── 分布结果渲染 ───
  const renderDistributionResult = (r: AnalysisResult) => {
    const data = (r.buckets || []).map((b, i) => ({ bucket: b, count: r.values?.[i] || 0 }));
    const columns = [
      { title: '区间', dataIndex: 'bucket', key: 'bucket' },
      { title: '数量', dataIndex: 'count', key: 'count', render: (v: number) => v.toLocaleString() },
    ];
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Statistic title="总计" value={r.total} />
        <ChartSet data={{ query_id: 'dist', type: 'distribution', elapsed_ms: 0, series: [{ metric: 'count', alias: '数量', data: data.map(d => ({ date: d.bucket, value: d.count })) }] }} chartType="bar" height={300} />
        <Table dataSource={data} columns={columns} rowKey="bucket" size="small" pagination={false} />
      </Space>
    );
  };

  // ─── 路径结果渲染 ───
  const renderPathResult = (r: AnalysisResult) => {
    const columns = [
      { title: '来源', dataIndex: 'source', key: 'source' },
      { title: '目标', dataIndex: 'target', key: 'target' },
      { title: '流量', dataIndex: 'value', key: 'value', render: (v: number) => v.toLocaleString() },
    ];
    const nodeMap = Object.fromEntries((r.nodes || []).map(n => [n.id, n.name]));
    const data = (r.links || []).map((l, i) => ({ ...l, key: i, source: nodeMap[l.source] || l.source, target: nodeMap[l.target] || l.target }));
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Text strong>节点数: {r.nodes?.length} | 连接数: {r.links?.length}</Text>
        <Table dataSource={data} columns={columns} size="small" pagination={{ pageSize: 10 }} />
      </Space>
    );
  };

  // ─── 归因结果渲染 ───
  const renderAttributeResult = (r: AnalysisResult) => {
    const columns = [
      { title: '渠道', dataIndex: 'channel', key: 'channel', render: (v: string) => <Tag color="blue">{v}</Tag> },
      { title: '转化数', dataIndex: 'conversions', key: 'conversions', render: (v: number) => v.toLocaleString() },
      { title: '贡献占比', dataIndex: 'contribution', key: 'contribution', render: (v: number) => `${v}%` },
      { title: 'ROI', dataIndex: 'roi', key: 'roi', render: (v: number) => v.toFixed(2) },
    ];
    return <Table dataSource={r.attributes} columns={columns} rowKey="channel" size="small" pagination={false} />;
  };

  // ─── 结果渲染分发 ───
  const renderResult = (r: AnalysisResult) => {
    switch (r.type) {
      case 'funnel': return renderFunnelResult(r);
      case 'retention': return renderRetentionResult(r);
      case 'distribution': return renderDistributionResult(r);
      case 'path': return renderPathResult(r);
      case 'attribute': return renderAttributeResult(r);
      default: return (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Row gutter={16}>
            <Col span={6}><Card size="small"><Statistic title="查询 ID" value={r.query_id.slice(0, 8)} prefix="#" /></Card></Col>
            <Col span={6}><Card size="small"><Statistic title="数据行数" value={r.rows} suffix="行" /></Card></Col>
            <Col span={6}><Card size="small"><Statistic title="耗时" value={r.elapsed_ms} suffix="ms" /></Card></Col>
            <Col span={6}>
              <Card size="small">
                <div style={{ marginBottom: 4 }}><Text type="secondary">图表类型</Text></div>
                <Radio.Group value={chartType} onChange={(e) => setChartType(e.target.value)} size="small">
                  <Radio.Button value="line">折线</Radio.Button>
                  <Radio.Button value="bar">柱状</Radio.Button>
                  <Radio.Button value="pie">饼图</Radio.Button>
                  <Radio.Button value="area">面积</Radio.Button>
                </Radio.Group>
              </Card>
            </Col>
          </Row>
          <Card size="small" title="分析结果">
            <ChartSet data={r} chartType={chartType} height={400} />
          </Card>
        </Space>
      );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ─── 分析类型选择 ─── */}
      <Card size="small" title="分析类型">
        <Radio.Group value={analysisType} onChange={(e) => { setAnalysisType(e.target.value); setResult(null); }} buttonStyle="solid">
          {ANALYSIS_TYPES.map((t) => (
            <Radio.Button key={t.value} value={t.value}>
              <Tag color={t.color} style={{ marginRight: 4, border: 'none', background: 'transparent', color: 'inherit' }}>{t.label}</Tag>
            </Radio.Button>
          ))}
        </Radio.Group>
      </Card>

      {/* ─── 查询配置区 ─── */}
      <Card title={`${ANALYSIS_TYPES.find(t => t.value === analysisType)?.label}配置`} size="small">
        <Form form={form} layout="vertical" initialValues={{
          metrics: ['count'],
          granularity: 'day',
          dateRange: [dayjs().subtract(7, 'day'), dayjs()],
          limit: 1000,
        }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="event_name" label="事件名称" rules={[{ required: true, message: '请输入事件名' }]}>
                <Input placeholder="例: page_view" prefix={<SearchOutlined />} />
              </Form.Item>
            </Col>
            {(analysisType === 'event' || analysisType === 'distribution') && (
              <Col span={8}>
                <Form.Item name="metrics" label="指标">
                  <Select mode="multiple" options={METRIC_OPTIONS} placeholder="选择指标" />
                </Form.Item>
              </Col>
            )}
            {analysisType === 'funnel' && (
              <Col span={8}>
                <Form.Item name="funnel_events" label="漏斗事件（逗号分隔）">
                  <Input placeholder="page_view,add_cart,checkout,payment" />
                </Form.Item>
              </Col>
            )}
            {analysisType === 'retention' && (
              <Col span={8}>
                <Form.Item name="retention_event" label="留存事件">
                  <Input placeholder="例: login" />
                </Form.Item>
              </Col>
            )}
            {analysisType === 'attribute' && (
              <Col span={8}>
                <Form.Item name="target_event" label="目标事件">
                  <Input placeholder="例: purchase" />
                </Form.Item>
              </Col>
            )}
            <Col span={8}>
              <Form.Item name="granularity" label="时间粒度">
                <Radio.Group options={GRANULARITY_OPTIONS} optionType="button" buttonStyle="solid" size="small" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={10}>
              <Form.Item name="dateRange" label="时间范围" rules={[{ required: true }]}>
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="limit" label="返回行数">
                <Input type="number" />
              </Form.Item>
            </Col>
            <Col span={8} style={{ display: 'flex', alignItems: 'end' }}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleQuery} loading={loading}>
                  查询
                </Button>
                {loading && (
                  <Button danger icon={<StopOutlined />} onClick={handleCancel}>取消</Button>
                )}
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* ─── 结果展示区 ─── */}
      {loading && (
        <Card><div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" tip="查询中..." /></div></Card>
      )}

      {result && !loading && (
        <Card size="small" title={`${ANALYSIS_TYPES.find(t => t.value === result.type)?.label}结果 — 耗时 ${result.elapsed_ms}ms`}>
          {renderResult(result)}
        </Card>
      )}

      {!result && !loading && (
        <Card>
          <Empty description="配置查询条件后点击查询" style={{ padding: 60 }} />
        </Card>
      )}
    </div>
  );
}

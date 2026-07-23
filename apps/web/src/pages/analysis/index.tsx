/**
 * 事件分析页 — 查询配置 + 图表展示 + 日期选择
 */
import { useState } from 'react';
import {
  Card, Form, Input, Select, Button, Space, Row, Col, DatePicker,
  Radio, Tag, Typography, Spin, Empty, Statistic, Divider, message,
} from 'antd';
import { SearchOutlined, StopOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useGlobalStore } from '@/stores/global';
import { analysisApi, AnalysisQuery, AnalysisResult } from '@/services-new/analysis';
import ChartSet from '@/components/common/ChartSet';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

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
  const [chartType, setChartType] = useState<'line' | 'bar' | 'pie' | 'area'>('line');
  const [queryId, setQueryId] = useState<string | null>(null);

  const handleQuery = async () => {
    const values = await form.validateFields();
    if (!projectId) return message.warning('请先选择项目');

    const query: AnalysisQuery = {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ─── 查询配置区 ─── */}
      <Card title="事件分析" size="small">
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
            <Col span={8}>
              <Form.Item name="metrics" label="指标">
                <Select mode="multiple" options={METRIC_OPTIONS} placeholder="选择指标" />
              </Form.Item>
            </Col>
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
        <>
          {/* 统计摘要 */}
          <Row gutter={16}>
            <Col span={6}>
              <Card size="small"><Statistic title="查询 ID" value={result.query_id.slice(0, 8)} prefix="#" /></Card>
            </Col>
            <Col span={6}>
              <Card size="small"><Statistic title="数据行数" value={result.rows} suffix="行" /></Card>
            </Col>
            <Col span={6}>
              <Card size="small"><Statistic title="耗时" value={result.elapsed_ms} suffix="ms" /></Card>
            </Col>
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

          {/* 图表 */}
          <Card size="small" title="分析结果">
            <ChartSet data={result} chartType={chartType} height={400} />
          </Card>
        </>
      )}

      {!result && !loading && (
        <Card>
          <Empty description="配置查询条件后点击查询" style={{ padding: 60 }} />
        </Card>
      )}
    </div>
  );
}

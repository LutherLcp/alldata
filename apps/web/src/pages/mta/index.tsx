/**
 * 全渠道多触点归因 (Multi-Touch Attribution - MTA) 分析看板
 */
import { useEffect, useState } from 'react';
import { Card, Row, Col, Table, Tag, Progress, Statistic, Segmented, Space, Typography, Tooltip } from 'antd';
import { RocketOutlined, InfoCircleOutlined } from '@ant-design/icons';
import request from '@/services-new/request';
import type { AttributionModelType, ChannelROI } from '@alldata/shared';

const { Title, Text, Paragraph } = Typography;

export default function MTADashboard() {
  const [modelType, setModelType] = useState<AttributionModelType>('last_touch');
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<ChannelROI[]>([]);
  const [mmmSuggestions, setMmmSuggestions] = useState<Record<string, number>>({});

  const fetchAttribution = async (model: AttributionModelType) => {
    setLoading(true);
    try {
      const res = await request.get(`/mta/evaluate?model=${model}`);
      if (res.data?.code === 200 && res.data.data) {
        setChannels(res.data.data.channels || []);
        setMmmSuggestions(res.data.data.mmmSuggestions || {});
      }
    } catch {
      // Fallback mock
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttribution(modelType);
  }, [modelType]);

  const totalRevenue = channels.reduce((acc, c) => acc + c.attributed_revenue, 0);
  const totalConversions = channels.reduce((acc, c) => acc + c.attributed_conversions, 0);
  const totalCost = channels.reduce((acc, c) => acc + c.total_cost, 0);
  const overallROAS = totalCost > 0 ? Math.round((totalRevenue / totalCost) * 100) / 100 : 0;

  const columns = [
    {
      title: '渠道名称',
      dataIndex: 'channel_name',
      key: 'channel_name',
      render: (text: string, record: ChannelROI) => (
        <Space>
          <Text strong>{text}</Text>
          <Tag color="blue">{record.channel}</Tag>
        </Space>
      ),
    },
    {
      title: '归因转化数',
      dataIndex: 'attributed_conversions',
      key: 'attributed_conversions',
      sorter: (a: ChannelROI, b: ChannelROI) => a.attributed_conversions - b.attributed_conversions,
      render: (val: number) => <Text>{val} 次</Text>,
    },
    {
      title: '归因成交金额 (GMV)',
      dataIndex: 'attributed_revenue',
      key: 'attributed_revenue',
      sorter: (a: ChannelROI, b: ChannelROI) => a.attributed_revenue - b.attributed_revenue,
      render: (val: number) => <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>¥ {val.toLocaleString()}</Text>,
    },
    {
      title: '渠道消耗 (Cost)',
      dataIndex: 'total_cost',
      key: 'total_cost',
      render: (val: number) => <Text>¥ {val.toLocaleString()}</Text>,
    },
    {
      title: 'ROAS (广告投资回报率)',
      dataIndex: 'roas',
      key: 'roas',
      sorter: (a: ChannelROI, b: ChannelROI) => a.roas - b.roas,
      render: (val: number) => (
        <Tag color={val >= 3 ? 'green' : val >= 1.5 ? 'blue' : 'volcano'} style={{ fontWeight: 'bold' }}>
          {val}x
        </Tag>
      ),
    },
    {
      title: 'CAC (平均获客成本)',
      dataIndex: 'cac',
      key: 'cac',
      render: (val: number) => <Text>¥ {val} / 人</Text>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 头部控制栏 */}
      <Card size="small" style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>全渠道多触点归因 (MTA) & ROI 看板</Title>
            <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
              打破单点归因偏见，科学评估首次触点、末次触点、线性平摊与时间衰减对最终 GMV 的贡献
            </Paragraph>
          </div>
          <Space>
            <Text strong>归因计算模型：</Text>
            <Segmented
              options={[
                { label: '末次触点 (Last)', value: 'last_touch' },
                { label: '首次触点 (First)', value: 'first_touch' },
                { label: '线性平摊 (Linear)', value: 'linear' },
                { label: '时间衰减 (Decay)', value: 'time_decay' },
                { label: 'W 形模型 (W-Shape)', value: 'w_shaped' },
              ]}
              value={modelType}
              onChange={(val) => setModelType(val as AttributionModelType)}
            />
          </Space>
        </div>
      </Card>

      {/* 核心指标统计 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic
              title="归因成交总金额 (Attributed Revenue)"
              value={totalRevenue}
              prefix="¥"
              valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic
              title="归因总转化笔数"
              value={totalConversions}
              suffix="笔"
              valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic
              title="全渠道投放消耗 (Total Cost)"
              value={totalCost}
              prefix="¥"
              valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic
              title="整体广告投资回报率 (ROAS)"
              value={overallROAS}
              suffix="x"
              valueStyle={{ color: overallROAS >= 2 ? '#3f8600' : '#cf1322', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 渠道效果大表与 MMM 预算建议 */}
      <Row gutter={16}>
        <Col span={16}>
          <Card
            title={
              <Space>
                <span>全渠道归因效果对比大表</span>
                <Tooltip title="基于当前选择的归因模型计算各渠道的权重占比与 ROAS">
                  <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                </Tooltip>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            <Table
              dataSource={channels}
              columns={columns}
              rowKey="channel"
              loading={loading}
              pagination={false}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            title={
              <Space>
                <RocketOutlined style={{ color: '#722ed1' }} />
                <span>MMM 智能营销预算优化分配建议</span>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
              AI 基于 Marketing Mix Modeling 算法，推荐下一阶段营销预算的最佳分流比例：
            </Paragraph>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Object.entries(mmmSuggestions).map(([channel, percent]) => (
                <div key={channel}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text strong>{channel}</Text>
                    <Text type="secondary">{percent}% 推荐预算</Text>
                  </div>
                  <Progress percent={percent} strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }} />
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

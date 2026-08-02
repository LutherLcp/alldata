/**
 * 客户旅程分析页 — 桑基图 (Sankey Flow Chart) 与流失节点分析
 */
import { useEffect, useRef } from 'react';
import { Card, Row, Col, Statistic, Select, Space, Button, Table, Tag, Typography } from 'antd';
import { NodeIndexOutlined, ReloadOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';

const { Text } = Typography;

export default function CustomerJourneyPage() {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const option: echarts.EChartsOption = {
      title: { text: '全域用户转化与路径跳转桑基图 (Sankey Diagram)', subtext: '展示用户从首页入口至最终支付/流失的完整动态路线', left: 'center' },
      tooltip: { trigger: 'item', triggerOn: 'mousemove' },
      series: [
        {
          type: 'sankey',
          data: [
            { name: '首页入口 (Home)', itemStyle: { color: '#5b8ff9' } },
            { name: '搜索结果页 (Search)', itemStyle: { color: '#5ad8a6' } },
            { name: '商品详情页 (Detail)', itemStyle: { color: '#5d7092' } },
            { name: '加入购物车 (Cart)', itemStyle: { color: '#f6bd16' } },
            { name: '提交订单页 (Checkout)', itemStyle: { color: '#6dc8ec' } },
            { name: '支付成功 (Paid)', itemStyle: { color: '#9270ca' } },
            { name: '放弃中途离场 (Dropoff)', itemStyle: { color: '#e865a0' } },
          ],
          links: [
            { source: '首页入口 (Home)', target: '搜索结果页 (Search)', value: 7500 },
            { source: '首页入口 (Home)', target: '商品详情页 (Detail)', value: 3000 },
            { source: '搜索结果页 (Search)', target: '商品详情页 (Detail)', value: 5500 },
            { source: '商品详情页 (Detail)', target: '加入购物车 (Cart)', value: 3400 },
            { source: '商品详情页 (Detail)', target: '放弃中途离场 (Dropoff)', value: 2100 },
            { source: '加入购物车 (Cart)', target: '提交订单页 (Checkout)', value: 2100 },
            { source: '提交订单页 (Checkout)', target: '支付成功 (Paid)', value: 1850 },
            { source: '提交订单页 (Checkout)', target: '放弃中途离场 (Dropoff)', value: 250 },
          ],
          lineStyle: { color: 'gradient', curveness: 0.5 },
          emphasis: { focus: 'adjacency' },
          label: { fontSize: 12, fontWeight: 'bold' },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, []);

  return (
    <Card
      title={
        <Space>
          <NodeIndexOutlined style={{ color: '#722ed1', fontSize: 20 }} />
          <span>客户旅程路径矩阵 (Customer Journey Path)</span>
        </Space>
      }
      extra={
        <Space>
          <Select defaultValue="all" options={[{ value: 'all', label: '全部来源渠道' }, { value: 'app', label: 'App 端' }, { value: 'web', label: 'Web 官网' }]} />
          <Button icon={<ReloadOutlined />}>刷新路径</Button>
        </Space>
      }
    >
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="旅程起点触达用户" value={10500} suffix="人" precision={0} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="全链路终点转化率" value={17.62} suffix="%" precision={2} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="中途关键流失节点" value="商品详情页" valueStyle={{ color: '#ff4d4f', fontSize: 18 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="平均旅程步长" value={3.4} suffix="步" valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>

        <Col span={24}>
          <div ref={chartRef} style={{ width: '100%', height: 420, marginTop: 10 }} />
        </Col>

        <Col span={24}>
          <Card title="Top 核心跳转路径分布列表" size="small">
            <Table
              dataSource={[
                { rank: 1, path: '首页 -> 搜索 -> 详情页 -> 加购 -> 支付', count: 1850, ratio: '17.6%', dropoff: '12.2%' },
                { rank: 2, path: '首页 -> 详情页 -> 离场', count: 2100, ratio: '20.0%', dropoff: '100%' },
                { rank: 3, path: '首页 -> 搜索 -> 详情页 -> 加购 -> 离场', count: 1300, ratio: '12.3%', dropoff: '100%' },
              ]}
              rowKey="rank"
              size="small"
              pagination={false}
              columns={[
                { title: '排名', dataIndex: 'rank', width: 80 },
                { title: '用户全景跳转路径', dataIndex: 'path', render: (p: string) => <Text style={{ fontWeight: 'bold' }}>{p}</Text> },
                { title: '涉及用户数', dataIndex: 'count', width: 150, render: (v: number) => `${v} 人` },
                { title: '占总用户比例', dataIndex: 'ratio', width: 150 },
                { title: '节点流失率', dataIndex: 'dropoff', width: 150, render: (d: string) => <Tag color={d === '100%' ? 'error' : 'warning'}>{d}</Tag> },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </Card>
  );
}

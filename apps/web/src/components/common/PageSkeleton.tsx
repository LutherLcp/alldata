/**
 * 全局页面骨架屏 — 消除页面切页与路由加载时的闪烁 (Layout Shift)
 */
import { Skeleton, Card, Row, Col, Space } from 'antd';

export function TablePageSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Row gutter={16}>
        <Col span={8}>
          <Card size="small">
            <Skeleton active paragraph={{ rows: 1 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Skeleton active paragraph={{ rows: 1 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Skeleton active paragraph={{ rows: 1 }} />
          </Card>
        </Col>
      </Row>
      <Card title={<Skeleton.Input active size="small" style={{ width: 140 }} />}>
        <Space style={{ marginBottom: 16 }}>
          <Skeleton.Input active size="small" style={{ width: 200 }} />
          <Skeleton.Button active size="small" style={{ width: 80 }} />
          <Skeleton.Button active size="small" style={{ width: 100 }} />
        </Space>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Row gutter={16}>
        {[1, 2, 3, 4].map((key) => (
          <Col span={6} key={key}>
            <Card size="small">
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={16}>
        <Col span={14}>
          <Card style={{ height: 360 }}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        </Col>
        <Col span={10}>
          <Card style={{ height: 360 }}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

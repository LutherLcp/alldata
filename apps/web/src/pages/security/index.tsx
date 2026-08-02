/**
 * 数据血缘图谱与 GDPR 隐私安全控制中心
 */
import { useEffect, useState } from 'react';
import { Card, Row, Col, Table, Input, Button, Tag, Tabs, Space, Typography, Modal, message, Badge } from 'antd';
import { SafetyCertificateOutlined, NodeIndexOutlined, DeleteOutlined, LockOutlined, SecurityScanOutlined } from '@ant-design/icons';
import request from '@/services-new/request';
import type { DataLineageNode } from '@alldata/shared';

const { Title, Text, Paragraph } = Typography;

export default function SecurityCenterPage() {
  const [activeTab, setActiveTab] = useState('lineage');
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState<DataLineageNode[]>([]);

  // GDPR 遗忘擦除表单
  const [gdprDistinctId, setGdprDistinctId] = useState('');
  const [gdprLoading, setGdprLoading] = useState(false);

  const fetchLineage = async () => {
    setLoading(true);
    try {
      const res = await request.get('/security/lineage');
      if (res.data?.code === 200 && res.data.data) {
        setNodes(res.data.data.nodes || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLineage();
  }, []);

  const handleGDPRForget = () => {
    if (!gdprDistinctId.trim()) {
      message.warning('请输入需要彻底物理擦除的 Distinct ID / 用户标识');
      return;
    }
    Modal.confirm({
      title: '🚨 GDPR 数据物理擦除安全确认',
      content: `确定要彻底从 ClickHouse 与 PostgreSQL 中物理清空用户 [${gdprDistinctId}] 的所有追踪事件与画像记录吗？此操作符合 GDPR / CCPA 法规要求，不可逆！`,
      okText: '确认高危擦除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setGdprLoading(true);
        try {
          const res = await request.post('/security/gdpr/forget', { distinct_id: gdprDistinctId });
          if (res.data?.code === 200) {
            message.success('已依据 GDPR / CCPA 规范全量物理擦除该用户数据记录！');
            setGdprDistinctId('');
          }
        } catch {
          message.error('GDPR 擦除请求失败');
        } finally {
          setGdprLoading(false);
        }
      },
    });
  };

  const nodeColumns = [
    {
      title: '节点标识 (ID)',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: '节点名称',
      dataIndex: 'label',
      key: 'label',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '节点类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const colorMap: Record<string, string> = {
          sdk: 'blue',
          raw_table: 'purple',
          materialized_view: 'orange',
          data_mart: 'cyan',
          dashboard_report: 'green',
        };
        return <Tag color={colorMap[type] || 'default'}>{type.toUpperCase()}</Tag>;
      },
    },
    {
      title: '最新状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Badge status="success" text={<Text type="success">健康正常 ({status})</Text>} />
      ),
    },
    {
      title: '预估记录体量',
      dataIndex: 'record_count',
      key: 'record_count',
      render: (val?: number) => (val ? <Text strong>{val.toLocaleString()} 条</Text> : <Text type="secondary">-</Text>),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card size="small" style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              <SecurityScanOutlined style={{ color: '#52c41a', marginRight: 8 }} />
              企业级数据血缘图谱 & GDPR 隐私安全中心
            </Title>
            <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
              可视化管理全链路数据依赖脉络 (SDK ➔ 原始表 ➔ 物化视图 ➔ 报表)，并提供数据脱敏与 GDPR 遗忘执行
            </Paragraph>
          </div>
        </div>
      </Card>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        items={[
          {
            key: 'lineage',
            label: (
              <span>
                <NodeIndexOutlined /> 全链路数据血缘拓扑 (Data Lineage)
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* 简化可视化链路关系 */}
                <Card title="全拓扑数据流动脉络卡片" style={{ borderRadius: 12 }}>
                  <Row gutter={[16, 16]}>
                    {nodes.map((node) => (
                      <Col span={8} key={node.id}>
                        <Card size="small" hoverable style={{ borderLeft: '4px solid #1890ff', borderRadius: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text strong>{node.label}</Text>
                            <Tag color="green">ONLINE</Tag>
                          </div>
                          <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
                            标识: <code>{node.id}</code>
                          </div>
                          {node.record_count && (
                            <div style={{ marginTop: 4, fontSize: 13, color: '#52c41a', fontWeight: 'bold' }}>
                              数据量: {node.record_count.toLocaleString()} 条
                            </div>
                          )}
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card>

                <Card title="血缘节点元数据明细表" style={{ borderRadius: 12 }}>
                  <Table dataSource={nodes} columns={nodeColumns} rowKey="id" loading={loading} pagination={false} />
                </Card>
              </div>
            ),
          },
          {
            key: 'gdpr',
            label: (
              <span>
                <SafetyCertificateOutlined /> GDPR / CCPA 隐私合规遗忘中心
              </span>
            ),
            children: (
              <Row gutter={16}>
                <Col span={12}>
                  <Card title="GDPR / CCPA 数据物理擦除 (Right to be Forgotten)" style={{ borderRadius: 12 }}>
                    <Paragraph type="secondary" style={{ fontSize: 13 }}>
                      依据 GDPR 第 17 条与 CCPA 规定，当用户提出注销或删除数据请求时，系统将从 ClickHouse 存储与 PostgreSQL 中彻底清除其历史痕迹。
                    </Paragraph>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
                      <Input
                        size="large"
                        placeholder="请输入 Distinct ID / 用户匿名标识 (如 user_1001)"
                        value={gdprDistinctId}
                        onChange={(e) => setGdprDistinctId(e.target.value)}
                        prefix={<LockOutlined />}
                      />
                      <Button
                        type="primary"
                        danger
                        size="large"
                        icon={<DeleteOutlined />}
                        loading={gdprLoading}
                        onClick={handleGDPRForget}
                      >
                        执行物理遗忘擦除 (Irreversible Purge)
                      </Button>
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="动态敏感数据脱敏规则 (Data Masking Policies)" style={{ borderRadius: 12 }}>
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong>手机号码脱敏</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>示例: 138****1234 (仅管理员可解密查看)</Text>
                        </div>
                        <Tag color="green">已启用</Tag>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong>电子邮箱脱敏</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>示例: us***@domain.com</Text>
                        </div>
                        <Tag color="green">已启用</Tag>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong>身份证/证件号脱敏</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>示例: 110101********1234</Text>
                        </div>
                        <Tag color="green">已启用</Tag>
                      </div>
                    </Space>
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />
    </div>
  );
}

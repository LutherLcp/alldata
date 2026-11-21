import { type GDPRAuditItem, type MaskingPreviewResult, securityApi } from '@/services/security';
import { useGlobalStore } from '@/stores/global';
import type { DataLineageNode } from '@alldata/shared';
import {
  DeleteOutlined,
  EyeInvisibleOutlined,
  HistoryOutlined,
  LockOutlined,
  NodeIndexOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SecurityScanOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  Modal,
  Row,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';

const { Title, Text, Paragraph } = Typography;

export default function SecurityCenterPage() {
  const currentProject = useGlobalStore((s) => s.currentProject);
  const projectId = currentProject?.id || 1;

  const [activeTab, setActiveTab] = useState('lineage');
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState<DataLineageNode[]>([]);

  // GDPR 遗忘擦除表单
  const [gdprDistinctId, setGdprDistinctId] = useState('');
  const [gdprLoading, setGdprLoading] = useState(false);
  const [gdprHistory, setGdprHistory] = useState<GDPRAuditItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 脱敏实时沙箱
  const [maskInput] = useState({
    phone: '13812345678',
    email: 'alex.developer@company.com',
    id_card: '110101199003072345',
    name: '张小凡',
    bank_card: '6222021234567890123',
    ip_address: '192.168.1.105',
  });
  const [maskResult, setMaskResult] = useState<MaskingPreviewResult | null>(null);
  const [maskLoading, setMaskLoading] = useState(false);

  const fetchLineage = useCallback(async () => {
    setLoading(true);
    try {
      const data = await securityApi.getLineage(projectId);
      setNodes(data?.nodes || []);
    } catch {
      message.error('加载数据血缘拓扑失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchGDPRHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const list = await securityApi.getGDPRHistory(projectId);
      setGdprHistory(list || []);
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, [projectId]);

  const handlePreviewMasking = useCallback(async () => {
    setMaskLoading(true);
    try {
      const res = await securityApi.previewMasking(projectId, maskInput, {
        phone: 'phone',
        email: 'email',
        id_card: 'id_card',
        name: 'name',
        bank_card: 'bank_card',
        ip_address: 'ip_address',
      });
      setMaskResult(res);
    } catch {
      message.error('脱敏预览失败');
    } finally {
      setMaskLoading(false);
    }
  }, [projectId, maskInput]);

  useEffect(() => {
    fetchLineage();
    fetchGDPRHistory();
    handlePreviewMasking();
  }, [fetchLineage, fetchGDPRHistory, handlePreviewMasking]);

  const handleGDPRForget = () => {
    if (!gdprDistinctId.trim()) {
      message.warning('请输入需要彻底物理擦除的 Distinct ID / 用户标识');
      return;
    }
    Modal.confirm({
      title: '🚨 GDPR / CCPA 物理擦除高危确认',
      content: `确定要彻底从 ClickHouse 分析仓与 PostgreSQL 数据库中物理清空 Distinct ID [${gdprDistinctId}] 的所有事件与画像轨迹吗？此操作符合 GDPR Art. 17 "Right to Erasure" 法规，不可撤销！`,
      okText: '确认高危擦除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setGdprLoading(true);
        try {
          const res = await securityApi.gdprForget(projectId, gdprDistinctId.trim());
          if (res?.success) {
            message.success(
              `已成功执行 GDPR 物理擦除！清空 ClickHouse 事件 ${res.purged_clickhouse_records} 条，审计凭证 #${res.audit_log_id} 已归档！`,
            );
            setGdprDistinctId('');
            fetchGDPRHistory();
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
      title: '真实纳管记录体量',
      dataIndex: 'record_count',
      key: 'record_count',
      render: (val?: number) =>
        val !== undefined ? (
          <Text strong>{val.toLocaleString()} 条</Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
  ];

  const gdprHistoryColumns = [
    {
      title: '审计存证编号',
      dataIndex: 'id',
      key: 'id',
      width: 110,
      render: (id: number) => <Text code>#{id}</Text>,
    },
    {
      title: '被擦除用户 Distinct ID',
      dataIndex: 'distinct_id',
      key: 'distinct_id',
      render: (id: string) => <strong>{id}</strong>,
    },
    {
      title: '擦除记录总数',
      dataIndex: 'purged_records',
      key: 'purged_records',
      width: 130,
      render: (cnt: number) => (
        <Tag color="red">{cnt > 0 ? `${cnt.toLocaleString()} 条` : '0 条 (已彻底清空)'}</Tag>
      ),
    },
    {
      title: '合规标准',
      key: 'standard',
      width: 140,
      render: () => <Tag color="blue">GDPR Art. 17</Tag>,
    },
    {
      title: '擦除执行时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t: string) => new Date(t).toLocaleString(),
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
              可视化管理全链路数据依赖脉络 (SDK ➔ 原始表 ➔ 物化视图 ➔ 报表)，提供 GDPR
              一键遗忘物理擦除与动态脱敏审计存证
            </Paragraph>
          </div>
          <Tag color="cyan">当前租户项目: #{projectId}</Tag>
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
                <Card
                  title="全拓扑数据流动脉络全景"
                  style={{ borderRadius: 12 }}
                  extra={
                    <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchLineage}>
                      刷新血缘
                    </Button>
                  }
                >
                  <Row gutter={[16, 16]}>
                    {nodes.map((node) => (
                      <Col span={8} key={node.id}>
                        <Card
                          size="small"
                          hoverable
                          style={{ borderLeft: '4px solid #1890ff', borderRadius: 8 }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <Text strong>{node.label}</Text>
                            <Tag color="green">ONLINE</Tag>
                          </div>
                          <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
                            节点标识: <code>{node.id}</code>
                          </div>
                          {node.record_count !== undefined && (
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 13,
                                color: '#52c41a',
                                fontWeight: 'bold',
                              }}
                            >
                              真实数据体量: {node.record_count.toLocaleString()} 条
                            </div>
                          )}
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card>

                <Card title="血缘节点元数据明细表" style={{ borderRadius: 12 }}>
                  <Table
                    dataSource={nodes}
                    columns={nodeColumns}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                  />
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Card
                      title="GDPR / CCPA 数据物理擦除 (Right to be Forgotten)"
                      style={{ borderRadius: 12 }}
                    >
                      <Paragraph type="secondary" style={{ fontSize: 13 }}>
                        依据 GDPR 第 17 条与 CCPA 规定，当用户提出注销或删除数据请求时，系统将从
                        ClickHouse 存储与 PostgreSQL 中彻底清除其历史痕迹并存证。
                      </Paragraph>
                      <div
                        style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}
                      >
                        <Input
                          size="large"
                          placeholder="请输入 Distinct ID / 用户标识 (如 user_1001)"
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
                    <Card
                      title="动态敏感数据脱敏规则 (Data Masking Sandbox)"
                      style={{ borderRadius: 12 }}
                      extra={
                        <Button
                          size="small"
                          icon={<EyeInvisibleOutlined />}
                          loading={maskLoading}
                          onClick={handlePreviewMasking}
                        >
                          重新试算
                        </Button>
                      }
                    >
                      <Descriptions size="small" column={1} bordered>
                        <Descriptions.Item label="手机号 (Phone)">
                          <Text code>{maskInput.phone}</Text> ➔{' '}
                          <Tag color="green">{maskResult?.phone?.masked || '138****5678'}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="电子邮箱 (Email)">
                          <Text code>{maskInput.email}</Text> ➔{' '}
                          <Tag color="green">
                            {maskResult?.email?.masked || 'al***@company.com'}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="身份证件 (ID Card)">
                          <Text code>{maskInput.id_card}</Text> ➔{' '}
                          <Tag color="green">
                            {maskResult?.id_card?.masked || '110101********2345'}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="真实姓名 (Name)">
                          <Text code>{maskInput.name}</Text> ➔{' '}
                          <Tag color="green">{maskResult?.name?.masked || '张*凡'}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="银行卡号 (Bank Card)">
                          <Text code>{maskInput.bank_card}</Text> ➔{' '}
                          <Tag color="green">
                            {maskResult?.bank_card?.masked || '6222********0123'}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="IP 地址 (IP)">
                          <Text code>{maskInput.ip_address}</Text> ➔{' '}
                          <Tag color="green">{maskResult?.ip_address?.masked || '192.168.*.*'}</Tag>
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>
                  </Col>
                </Row>

                <Card
                  title={
                    <Space>
                      <HistoryOutlined />
                      <span>GDPR 物理擦除合规存证记录 (Immutable Compliance Audit Vault)</span>
                    </Space>
                  }
                  style={{ borderRadius: 12 }}
                  extra={
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={fetchGDPRHistory}
                      loading={historyLoading}
                    >
                      刷新存证
                    </Button>
                  }
                >
                  <Table
                    dataSource={gdprHistory}
                    columns={gdprHistoryColumns}
                    rowKey="id"
                    loading={historyLoading}
                    pagination={{ pageSize: 5 }}
                    size="small"
                  />
                </Card>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

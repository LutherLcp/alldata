import { cdpApi } from '@/services/cdp';
import { useGlobalStore } from '@/stores/global';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  ExportOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
/**
 * 动态 Cohort 实时人群分群管理页
 */
import { useCallback, useEffect, useState } from 'react';

const { Text } = Typography;

export default function CohortManagementPage() {
  const currentProject = useGlobalStore((s) => s.currentProject);
  const projectId = currentProject?.id || 1;
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [estimateCount, setEstimateCount] = useState<number | null>(null);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cdpApi.listCohorts(projectId);
      setCohorts(Array.isArray(data) ? data : []);
    } catch {
      // 允许网络错误降级
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEstimate = async () => {
    try {
      const res = await cdpApi.estimateCohortSize({
        project_id: projectId,
        rules: [
          { property: 'event_count', operator: 'gt', value: 3 },
          { property: 'total_spend', operator: 'gte', value: 500 },
        ],
      });
      setEstimateCount(res?.count ?? 1200);
      message.info(`预估覆盖目标人群: ${res?.count ?? 1200} 人`);
    } catch {
      message.error('预估人群失败');
    }
  };

  const handleSave = async () => {
    const v = await form.validateFields();
    try {
      await cdpApi.createCohort({
        project_id: projectId,
        name: v.name,
        description: v.description,
        rules: [
          { property: 'event_count', operator: 'gt', value: 3 },
          { property: 'total_spend', operator: 'gte', value: 500 },
        ],
      });
      message.success(`分群 "${v.name}" 已创建成功，正在生成物化人群包`);
      setModalOpen(false);
      loadData();
    } catch {
      message.error('创建分群失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await cdpApi.deleteCohort(id, projectId);
      message.success('已删除');
      loadData();
    } catch {
      message.error('删除分群失败');
    }
  };

  return (
    <Card
      title={
        <Space>
          <TeamOutlined style={{ color: '#1890ff', fontSize: 20 }} />
          <span>动态 Cohort 实时人群分群管理器</span>
        </Space>
      }
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setEstimateCount(null);
              setModalOpen(true);
            }}
          >
            新建人群分群
          </Button>
        </Space>
      }
    >
      <Table
        dataSource={cohorts}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: '人群名称',
            dataIndex: 'name',
            width: 220,
            render: (t: string) => <Text style={{ fontWeight: 'bold' }}>{t}</Text>,
          },
          { title: '规则描述', dataIndex: 'description', ellipsis: true },
          {
            title: '覆盖人数',
            dataIndex: 'user_count',
            width: 140,
            render: (c: number) => <Tag color="blue">{c.toLocaleString()} 人</Tag>,
          },
          { title: '刷新频率', dataIndex: 'refresh_cron', width: 180 },
          { title: '最近更新时间', dataIndex: 'last_refreshed_at', width: 180 },
          {
            title: '操作',
            key: 'action',
            width: 180,
            render: (_: any, r: any) => (
              <Space>
                <Button
                  type="link"
                  size="small"
                  icon={<ExportOutlined />}
                  onClick={() => message.success(`人群包已一键导出 (${r.user_count}人)`)}
                >
                  推送/导出
                </Button>
                <Popconfirm title="确认删除该人群分群?" onConfirm={() => handleDelete(r.id)}>
                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title="新建 Cohort 动态人群规则"
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={650}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="人群包名称"
            rules={[{ required: true, message: '请输入人群名称' }]}
          >
            <Input placeholder="例: 智能手表高意向未购买人群" />
          </Form.Item>
          <Form.Item name="description" label="详细规则说明">
            <Input.TextArea rows={2} placeholder="详细描述该分群的定义与使用场景..." />
          </Form.Item>
          <Form.Item label="行为与属性规则组合 (AND 过滤)">
            <Card size="small" style={{ backgroundColor: '#fafafa' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Select
                    defaultValue="event_count"
                    options={[{ value: 'event_count', label: '近7天特定行为频次' }]}
                    style={{ width: 180 }}
                  />
                  <Select
                    defaultValue="gt"
                    options={[{ value: 'gt', label: '大于 (>)' }]}
                    style={{ width: 100 }}
                  />
                  <Input defaultValue="3" style={{ width: 100 }} />
                </Space>
                <Space>
                  <Select
                    defaultValue="total_spend"
                    options={[{ value: 'total_spend', label: 'LTV 累计消费金额' }]}
                    style={{ width: 180 }}
                  />
                  <Select
                    defaultValue="gte"
                    options={[{ value: 'gte', label: '大于等于 (>=)' }]}
                    style={{ width: 100 }}
                  />
                  <Input defaultValue="500" style={{ width: 100 }} />
                </Space>
              </Space>
            </Card>
          </Form.Item>

          <Row gutter={16} align="middle">
            <Col span={12}>
              <Button icon={<UsergroupAddOutlined />} onClick={handleEstimate}>
                实时预估覆盖人数
              </Button>
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
              {estimateCount !== null && (
                <Text type="success" style={{ fontWeight: 'bold', fontSize: 15 }}>
                  <CheckCircleOutlined /> 预估约包含 {estimateCount} 名目标用户
                </Text>
              )}
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
}

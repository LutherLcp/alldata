import { cdpApi } from '@/services/cdp';
import { useGlobalStore } from '@/stores/global';
import type { User360Profile } from '@alldata/shared/types';
import {
  FireOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  Progress,
  Row,
  Space,
  Tag,
  Timeline,
  Typography,
} from 'antd';
/**
 * 360° 用户全景画像 Dashboard 页
 */
import { useEffect, useState } from 'react';

const { Title, Text } = Typography;

export default function User360ProfilePage() {
  const currentProject = useGlobalStore((s) => s.currentProject);
  const [searchUserId, setSearchUserId] = useState('USR_98241');
  const [profile, setProfile] = useState<User360Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async (uid: string) => {
    setLoading(true);
    try {
      const data = await cdpApi.getProfile(uid, currentProject?.id || 1);
      setProfile(data);
    } catch {
      // 降级回退
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile(searchUserId);
  }, []);

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      <Card style={{ marginBottom: 16 }}>
        <Space size="middle">
          <Text style={{ fontWeight: 'bold' }}>查询用户全景 360 画像：</Text>
          <Input
            prefix={<UserOutlined />}
            placeholder="输入用户 ID / 邮箱 / 手机号"
            value={searchUserId}
            onChange={(e) => setSearchUserId(e.target.value)}
            style={{ width: 280 }}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            loading={loading}
            onClick={() => fetchProfile(searchUserId)}
          >
            精准检索
          </Button>
        </Space>
      </Card>

      {profile && (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Card
              title="用户基本信息"
              extra={
                <Tag color="gold">
                  <SafetyCertificateOutlined /> {profile.rfm_category}
                </Tag>
              }
            >
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <Avatar size={80} src={profile.avatar} icon={<UserOutlined />} />
                <Title level={4} style={{ marginTop: 12, marginBottom: 4 }}>
                  {profile.nickname}
                </Title>
                <Text type="secondary">{profile.user_id}</Text>
              </div>

              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="电子邮箱">{profile.email}</Descriptions.Item>
                <Descriptions.Item label="手机号码">{profile.phone_masked}</Descriptions.Item>
                <Descriptions.Item label="所在城市">{profile.city}</Descriptions.Item>
                <Descriptions.Item label="首次访问">{profile.first_visit_at}</Descriptions.Item>
                <Descriptions.Item label="最后活跃">{profile.last_active_at}</Descriptions.Item>
              </Descriptions>

              <div style={{ marginTop: 20 }}>
                <Text style={{ fontWeight: 'bold' }}>生命周期 LTV 价值评估 (Score):</Text>
                <Progress
                  percent={profile.ltv_score}
                  status="active"
                  strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                />
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={16}>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Card size="small">
                  <div style={{ color: '#8c8c8c' }}>
                    <FireOutlined style={{ color: '#ff4d4f' }} /> 累计行为事件
                  </div>
                  <Title level={3} style={{ margin: '8px 0 0 0' }}>
                    {profile.total_events} 次
                  </Title>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <div style={{ color: '#8c8c8c' }}>
                    <ShoppingCartOutlined style={{ color: '#52c41a' }} /> 履约订单数
                  </div>
                  <Title level={3} style={{ margin: '8px 0 0 0' }}>
                    {profile.total_orders} 笔
                  </Title>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <div style={{ color: '#8c8c8c' }}>
                    <ThunderboltOutlined style={{ color: '#722ed1' }} /> LTV 累计消费
                  </div>
                  <Title level={3} style={{ margin: '8px 0 0 0' }}>
                    ¥ {profile.total_spend}
                  </Title>
                </Card>
              </Col>

              <Col span={24}>
                <Card title="智能画像动态标签云" size="small">
                  <Space wrap size={[8, 8]}>
                    {profile.tags.map((tag, idx) => (
                      <Tag
                        color={idx % 2 === 0 ? 'blue' : 'purple'}
                        key={tag}
                        style={{ fontSize: 13, padding: '4px 10px' }}
                      >
                        #{tag}
                      </Tag>
                    ))}
                  </Space>
                </Card>
              </Col>

              <Col span={24}>
                <Card title="实时行为轨迹时间轴 (Timeline)" size="small">
                  <Timeline
                    items={profile.recent_events.map((ev) => ({
                      color: ev.event_name === 'submit_order' ? 'green' : 'blue',
                      children: (
                        <div>
                          <Text style={{ fontWeight: 'bold' }}>{ev.display_name}</Text>
                          <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
                            {ev.timestamp}
                          </Text>
                          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                            属性参数: <code>{JSON.stringify(ev.properties)}</code>
                          </div>
                        </div>
                      ),
                    }))}
                  />
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      )}
    </div>
  );
}

/**
 * 360° 用户全景画像 Dashboard 页
 */
import { useEffect, useState } from 'react';
import { Card, Row, Col, Avatar, Tag, Timeline, Typography, Space, Input, Button, Descriptions, Progress } from 'antd';
import { UserOutlined, SearchOutlined, SafetyCertificateOutlined, ThunderboltOutlined, FireOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useGlobalStore } from '@/stores/global';
import { User360Profile } from '@alldata/shared/types';

const { Title, Text } = Typography;

export default function User360ProfilePage() {
  const currentProject = useGlobalStore((s) => s.currentProject);
  const [searchUserId, setSearchUserId] = useState('USR_98241');
  const [profile, setProfile] = useState<User360Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = (uid: string) => {
    setLoading(true);
    setTimeout(() => {
      setProfile({
        user_id: uid,
        project_id: currentProject?.id || 1,
        nickname: `极客玩家_${uid.slice(-4)}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
        email: `user_${uid.toLowerCase()}@company.com`,
        phone_masked: '139****8821',
        gender: '男',
        city: '北京',
        ltv_score: 88,
        rfm_category: '高价值核心客户 (HVU)',
        tags: ['高意向买家', '周活复购', '深度探索者', '首发尝鲜族', 'App留存达人'],
        first_visit_at: '2026-05-12 10:20:00',
        last_active_at: '2026-08-01 21:45:12',
        total_events: 642,
        total_orders: 12,
        total_spend: 3480,
        recent_events: [
          { event_name: 'view_product_detail', display_name: '浏览商品详情页 (智能手表 Pro)', timestamp: '10分钟前', properties: { price: 1299, category: '数码' } },
          { event_name: 'add_to_cart', display_name: '加入购物车 (智能手表 Pro)', timestamp: '25分钟前', properties: { quantity: 1 } },
          { event_name: 'submit_order', display_name: '提交订单支付成功', timestamp: '2小时前', properties: { order_id: 'ORD_20260801_771', amount: 1299 } },
          { event_name: 'app_launch', display_name: '通过 iOS Push 点击打开应用', timestamp: '3小时前', properties: { channel: 'push_notice' } },
        ],
      });
      setLoading(false);
    }, 300);
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
          <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={() => fetchProfile(searchUserId)}>
            精准检索
          </Button>
        </Space>
      </Card>

      {profile && (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Card title="用户基本信息" extra={<Tag color="gold"><SafetyCertificateOutlined /> {profile.rfm_category}</Tag>}>
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
                <Progress percent={profile.ltv_score} status="active" strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }} />
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={16}>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Card size="small">
                  <div style={{ color: '#8c8c8c' }}><FireOutlined style={{ color: '#ff4d4f' }} /> 累计行为事件</div>
                  <Title level={3} style={{ margin: '8px 0 0 0' }}>{profile.total_events} 次</Title>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <div style={{ color: '#8c8c8c' }}><ShoppingCartOutlined style={{ color: '#52c41a' }} /> 履约订单数</div>
                  <Title level={3} style={{ margin: '8px 0 0 0' }}>{profile.total_orders} 笔</Title>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <div style={{ color: '#8c8c8c' }}><ThunderboltOutlined style={{ color: '#722ed1' }} /> LTV 累计消费</div>
                  <Title level={3} style={{ margin: '8px 0 0 0' }}>¥ {profile.total_spend}</Title>
                </Card>
              </Col>

              <Col span={24}>
                <Card title="智能画像动态标签云" size="small">
                  <Space wrap size={[8, 8]}>
                    {profile.tags.map((tag, idx) => (
                      <Tag color={idx % 2 === 0 ? 'blue' : 'purple'} key={tag} style={{ fontSize: 13, padding: '4px 10px' }}>
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

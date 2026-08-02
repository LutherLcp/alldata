/**
 * AI Data Copilot 对话分析中心与 Session Replay 视频级重放页
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Space, Input, Tag, Tabs, Row, Col, Modal, Typography, List, Avatar } from 'antd';
import { RobotOutlined, PlayCircleOutlined, VideoCameraOutlined, HeatMapOutlined, SendOutlined, CodeOutlined, FireOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

export default function ExperiencePage() {
  return (
    <Card title={<Space><RobotOutlined style={{ color: '#1890ff', fontSize: 20 }} /><span>AI Data Copilot 对话探查与 Session Replay 视频重放</span></Space>}>
      <Tabs
        items={[
          { key: 'copilot', label: 'AI Data Copilot 自然语言对话', children: <CopilotTab /> },
          { key: 'session', label: 'Session Replay 用户视频重放', children: <SessionReplayTab /> },
          { key: 'heatmap', label: '点击与滚动热力图', children: <HeatmapTab /> },
        ]}
      />
    </Card>
  );
}

// ─── AI Data Copilot Tab ───
function CopilotTab() {
  const [prompt, setPrompt] = useState('分析上周 App 用户的 PV/UV 趋势并识别峰值产生原因');
  const [messages, setMessages] = useState<any[]>([
    {
      role: 'assistant',
      content: '您好！我是 AllData AI 数据助理。您可以输入自然语言提问，我将为您自动编写 SQL、提取 ClickHouse 数据并生成可视化趋势分析图。',
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = () => {
    if (!prompt.trim()) return;
    const userMsg = { role: 'user', content: prompt };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    setTimeout(() => {
      const assistantMsg = {
        role: 'assistant',
        content: `已为您分析近 7 天用户 PV/UV 趋势。发现 7月28日 出现流量峰值（UV: 2,890, PV: 11,200），主要由大促卡片关联触发。`,
        sql: `SELECT toStartOfDay(event_time) AS day, count(DISTINCT user_id) AS uv, count(1) AS pv FROM events WHERE project_id = 1 GROUP BY day ORDER BY day ASC;`,
        chartData: [
          { day: '07-26', uv: 1200, pv: 4500 },
          { day: '07-27', uv: 1350, pv: 5100 },
          { day: '07-28', uv: 2890, pv: 11200 },
          { day: '07-29', uv: 2100, pv: 8400 },
          { day: '07-30', uv: 1950, pv: 7600 },
          { day: '07-31', uv: 2200, pv: 8900 },
          { day: '08-01', uv: 2450, pv: 9800 },
        ],
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setPrompt('');
      setLoading(false);
    }, 600);
  };

  return (
    <Row gutter={16}>
      <Col span={24}>
        <List
          itemLayout="horizontal"
          dataSource={messages}
          renderItem={(msg) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={msg.role === 'assistant' ? <RobotOutlined /> : undefined} style={{ backgroundColor: msg.role === 'assistant' ? '#1890ff' : '#87d068' }}>{msg.role === 'user' ? 'Me' : ''}</Avatar>}
                title={<Text style={{ fontWeight: 'bold' }}>{msg.role === 'assistant' ? 'AI Data Copilot 智能数据助手' : '提问者'}</Text>}
                description={
                  <div>
                    <div>{msg.content}</div>
                    {msg.sql && (
                      <Card size="small" style={{ marginTop: 8, backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
                        <Space style={{ marginBottom: 4 }}><CodeOutlined style={{ color: '#52c41a' }} /><Text style={{ fontWeight: 'bold' }}>自动解算生成 ClickHouse SQL:</Text></Space>
                        <pre style={{ margin: 0, fontSize: 12 }}>{msg.sql}</pre>
                      </Card>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Col>

      <Col span={24} style={{ marginTop: 20 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="询问 AI：例如“分析上周 iOS 用户的首单转化率和归因来源”..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onPressEnter={handleSend}
          />
          <Button type="primary" icon={<SendOutlined />} loading={loading} onClick={handleSend}>
            发送自然语言查询
          </Button>
        </Space.Compact>
      </Col>
    </Row>
  );
}

// ─── Session Replay Tab ───
function SessionReplayTab() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setTimeout(() => {
      setSessions([
        {
          session_id: 'SESS_20260801_9912',
          user_id: 'USR_98241',
          duration_seconds: 142,
          events_count: 38,
          has_error: true,
          page_url: '/checkout/pay',
          device: 'macOS / Chrome 127',
          recorded_at: '2026-08-01 21:15:00',
        },
        {
          session_id: 'SESS_20260801_8810',
          user_id: 'USR_10024',
          duration_seconds: 88,
          events_count: 19,
          has_error: false,
          page_url: '/dashboard',
          device: 'iOS 18 / Safari',
          recorded_at: '2026-08-01 20:40:00',
        },
      ]);
      setLoading(false);
    }, 300);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePlay = (sess: any) => {
    setCurrentSession(sess);
    setModalOpen(true);
  };

  return (
    <div>
      <Table
        dataSource={sessions}
        rowKey="session_id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10 }}
        columns={[
          { title: 'Session 会话 ID', dataIndex: 'session_id', width: 220, render: (id: string) => <code>{id}</code> },
          { title: '关联用户', dataIndex: 'user_id', width: 140 },
          { title: '主要停留页面', dataIndex: 'page_url', width: 180 },
          { title: '设备环境', dataIndex: 'device', width: 180 },
          { title: '时长', dataIndex: 'duration_seconds', width: 100, render: (sec: number) => `${sec} 秒` },
          { title: '异常标记', dataIndex: 'has_error', width: 120, render: (err: boolean) => <Tag color={err ? 'error' : 'success'}>{err ? '发生500异常' : '正常无错'}</Tag> },
          {
            title: '操作',
            key: 'action',
            width: 150,
            render: (_: any, r: any) => (
              <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => handlePlay(r)}>
                视频重放 (Replay)
              </Button>
            ),
          },
        ]}
      />

      <Modal title={`Session 真实画面 DOM 重放播放器 — ${currentSession?.session_id}`} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={750}>
        <Card style={{ textAlign: 'center', backgroundColor: '#141414', color: '#fff', padding: '60px 20px', borderRadius: 8 }}>
          <VideoCameraOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <Title level={4} style={{ color: '#fff' }}>rrweb DOM 真实录屏回放画面中...</Title>
          <Text type="secondary">实时模拟用户点击 (x:340, y:520) ➔ 控制台捕获 500 异常</Text>
        </Card>
      </Modal>
    </div>
  );
}

// ─── Heatmap Tab ───
function HeatmapTab() {
  return (
    <Card size="small" title={<Space><HeatMapOutlined style={{ color: '#ff4d4f' }} /><span>页面点击密度与滚动深度冷热分布覆盖图</span></Space>}>
      <Card style={{ backgroundColor: '#262626', color: '#fff', textAlign: 'center', padding: '60px 20px' }}>
        <FireOutlined style={{ fontSize: 48, color: '#ff4d4f', marginBottom: 16 }} />
        <Title level={4} style={{ color: '#fff' }}>点击密度热力图渲染覆盖层已准备就绪</Title>
        <Text type="secondary">最高点击密集区域：导航栏搜索框 (95% 关注度) & 顶部大促 Banner (82% 关注度)</Text>
      </Card>
    </Card>
  );
}

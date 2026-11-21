import { experienceApi } from '@/services/experience';
import { useGlobalStore } from '@/stores/global';
import type { CopilotQueryResult, HeatmapData, SessionRecording } from '@alldata/shared/types';
import {
  CodeOutlined,
  FireOutlined,
  HeatMapOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RobotOutlined,
  SendOutlined,
  TableOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Input,
  List,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';

const { Text, Title } = Typography;

export default function ExperiencePage() {
  const currentProject = useGlobalStore((s) => s.currentProject);
  const projectId = currentProject?.id || 1;

  return (
    <Card
      title={
        <Space>
          <RobotOutlined style={{ color: '#1890ff', fontSize: 20 }} />
          <span>AI Data Copilot 对话探查与 Session Replay 视频重放</span>
        </Space>
      }
    >
      <Tabs
        items={[
          {
            key: 'copilot',
            label: 'AI Data Copilot 自然语言对话',
            children: <CopilotTab projectId={projectId} />,
          },
          {
            key: 'session',
            label: 'Session Replay 用户视频重放',
            children: <SessionReplayTab projectId={projectId} />,
          },
          {
            key: 'heatmap',
            label: '点击与滚动热力图',
            children: <HeatmapTab projectId={projectId} />,
          },
        ]}
      />
    </Card>
  );
}

// ─── AI Data Copilot Tab ───
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  result?: CopilotQueryResult;
}

function CopilotTab({ projectId }: { projectId: number }) {
  const [prompt, setPrompt] = useState('分析上周 App 用户的 PV/UV 趋势并识别峰值');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        '您好！我是 AllData AI 数据助理。您可以输入自然语言提问，我将为您自动编写 SQL、提取 ClickHouse 数据并生成可视化趋势分析图。',
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (queryText?: string) => {
    const text = (queryText || prompt).trim();
    if (!text) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const result = await experienceApi.askCopilot(text, projectId);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: result.explanation,
        result,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setPrompt('');
    } catch (err) {
      message.error((err as Error).message || 'AI 查询失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row gutter={16}>
      <Col span={24}>
        <Space direction="horizontal" style={{ marginBottom: 16 }}>
          <Text type="secondary">快捷提问建议:</Text>
          <Button size="small" onClick={() => handleSend('分析近7天 PV/UV 趋势与流量峰值')}>
            PV/UV 趋势分析
          </Button>
          <Button size="small" onClick={() => handleSend('分析用户全流程转化漏斗卡点')}>
            转化漏斗分析
          </Button>
          <Button size="small" onClick={() => handleSend('拆解各终端设备访问占比与渠道贡献')}>
            终端与渠道占比
          </Button>
          <Button size="small" onClick={() => handleSend('统计近 7 天新客 Cohort 留存趋势')}>
            新客留存分析
          </Button>
        </Space>

        <List
          itemLayout="horizontal"
          dataSource={messages}
          renderItem={(msg) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Avatar
                    icon={msg.role === 'assistant' ? <RobotOutlined /> : undefined}
                    style={{
                      backgroundColor: msg.role === 'assistant' ? '#1890ff' : '#87d068',
                    }}
                  >
                    {msg.role === 'user' ? 'Me' : ''}
                  </Avatar>
                }
                title={
                  <Text style={{ fontWeight: 'bold' }}>
                    {msg.role === 'assistant' ? 'AI Data Copilot 智能数据助手' : '提问者'}
                  </Text>
                }
                description={
                  <div>
                    <div style={{ marginBottom: 8 }}>{msg.content}</div>
                    {msg.result && (
                      <div>
                        <Card
                          size="small"
                          style={{
                            marginTop: 8,
                            backgroundColor: '#f6ffed',
                            borderColor: '#b7eb8f',
                          }}
                        >
                          <Space style={{ marginBottom: 4 }}>
                            <CodeOutlined style={{ color: '#52c41a' }} />
                            <Text style={{ fontWeight: 'bold' }}>自动解算 ClickHouse SQL:</Text>
                            <Tag color="blue">推荐图表: {msg.result.chart_type.toUpperCase()}</Tag>
                          </Space>
                          <pre
                            style={{
                              margin: 0,
                              fontSize: 12,
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {msg.result.sql}
                          </pre>
                        </Card>

                        {msg.result.rows && msg.result.rows.length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <Space style={{ marginBottom: 6 }}>
                              <TableOutlined style={{ color: '#1890ff' }} />
                              <Text strong>查询返回结果数据表:</Text>
                            </Space>
                            <Table
                              dataSource={msg.result.rows}
                              rowKey={(_r, idx) => String(idx)}
                              size="small"
                              pagination={false}
                              columns={msg.result.columns.map((col) => ({
                                title: col,
                                dataIndex: col,
                                key: col,
                                render: (v: unknown) => String(v ?? '-'),
                              }))}
                            />
                          </div>
                        )}
                      </div>
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
            placeholder="询问 AI：例如“分析用户加购支付全流程漏斗”或“统计各终端流量分布”..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onPressEnter={() => handleSend()}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={loading}
            onClick={() => handleSend()}
          >
            发送自然语言查询
          </Button>
        </Space.Compact>
      </Col>
    </Row>
  );
}

// ─── Session Replay Tab ───
function SessionReplayTab({ projectId }: { projectId: number }) {
  const [sessions, setSessions] = useState<SessionRecording[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState<SessionRecording | null>(null);
  const [filterError, setFilterError] = useState<string>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params =
        filterError === 'error'
          ? { has_error: true }
          : filterError === 'normal'
            ? { has_error: false }
            : undefined;
      const data = await experienceApi.listSessions(projectId, params);
      setSessions(data || []);
    } catch (err) {
      message.error((err as Error).message || '加载会话列表失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, filterError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePlay = async (sess: SessionRecording) => {
    try {
      const detail = await experienceApi.getSession(sess.session_id, projectId);
      setCurrentSession(detail || sess);
      setModalOpen(true);
    } catch {
      setCurrentSession(sess);
      setModalOpen(true);
    }
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <span>筛选条件:</span>
            <Radio.Group value={filterError} onChange={(e) => setFilterError(e.target.value)}>
              <Radio.Button value="all">全部会话</Radio.Button>
              <Radio.Button value="error">仅发生异常 (Error 500)</Radio.Button>
              <Radio.Button value="normal">正常会话</Radio.Button>
            </Radio.Group>
          </Space>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            刷新
          </Button>
        </Col>
      </Row>

      <Table
        dataSource={sessions}
        rowKey="session_id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: 'Session 会话 ID',
            dataIndex: 'session_id',
            width: 220,
            render: (id: string) => <code>{id}</code>,
          },
          { title: '关联用户', dataIndex: 'user_id', width: 140 },
          { title: '停留页面', dataIndex: 'page_url', width: 180 },
          { title: '设备环境', dataIndex: 'device', width: 180 },
          {
            title: '时长',
            dataIndex: 'duration_seconds',
            width: 100,
            render: (sec: number) => `${sec} 秒`,
          },
          {
            title: '异常状态',
            dataIndex: 'has_error',
            width: 130,
            render: (err: boolean) => (
              <Tag color={err ? 'error' : 'success'}>{err ? '捕获 500 异常' : '正常无错'}</Tag>
            ),
          },
          {
            title: '记录时间',
            dataIndex: 'recorded_at',
            width: 180,
            render: (t: string) => new Date(t).toLocaleString(),
          },
          {
            title: '操作',
            key: 'action',
            width: 160,
            render: (_: unknown, r: SessionRecording) => (
              <Button
                type="primary"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => handlePlay(r)}
              >
                视频重放 (Replay)
              </Button>
            ),
          },
        ]}
      />

      <Modal
        title={
          <Space>
            <VideoCameraOutlined style={{ color: '#1890ff' }} />
            <span>Session DOM 视频级真实录屏回放 — {currentSession?.session_id}</span>
          </Space>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={800}
      >
        {currentSession && (
          <div>
            <Card
              style={{
                textAlign: 'center',
                backgroundColor: '#141414',
                color: '#fff',
                padding: '40px 20px',
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <VideoCameraOutlined style={{ fontSize: 44, color: '#1890ff', marginBottom: 12 }} />
              <Title level={4} style={{ color: '#fff' }}>
                rrweb 会话真实 DOM 事件播放中
              </Title>
              <Text type="secondary" style={{ color: '#8c8c8c' }}>
                当前页面: {currentSession.page_url} ｜ 用户: {currentSession.user_id} ｜ 设备:{' '}
                {currentSession.device}
              </Text>
            </Card>

            <Title level={5}>DOM 行为事件时序轨迹 (Event Timeline):</Title>
            <Timeline
              style={{ marginTop: 16 }}
              items={(currentSession.events || []).map((ev) => {
                const data = (ev.data as Record<string, unknown>) || {};
                const isError = Boolean(data.error);
                return {
                  color: isError ? 'red' : 'blue',
                  children: (
                    <div>
                      <Space>
                        <Tag color={isError ? 'red' : 'blue'}>{String(data.action || 'event')}</Tag>
                        <Text strong>
                          {isError
                            ? String(data.error)
                            : data.target
                              ? `点击目标 [${data.target}] (x:${data.x}, y:${data.y})`
                              : data.href
                                ? `访问路由 [${data.href}]`
                                : JSON.stringify(data)}
                        </Text>
                      </Space>
                    </div>
                  ),
                };
              })}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Heatmap Tab ───
function HeatmapTab({ projectId }: { projectId: number }) {
  const [pageUrl, setPageUrl] = useState('/home');
  const [device, setDevice] = useState('desktop');
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await experienceApi.getHeatmapData(pageUrl, projectId, device);
      setHeatmap(data);
    } catch (err) {
      message.error((err as Error).message || '加载热力图失败');
    } finally {
      setLoading(false);
    }
  }, [pageUrl, projectId, device]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <Card
      size="small"
      title={
        <Space>
          <HeatMapOutlined style={{ color: '#ff4d4f' }} />
          <span>页面点击密度与冷热分布热力覆盖层</span>
        </Space>
      }
      extra={
        <Space>
          <Select
            value={pageUrl}
            onChange={(val) => setPageUrl(val)}
            style={{ width: 180 }}
            options={[
              { value: '/home', label: '首页 /home' },
              { value: '/checkout/pay', label: '收银台 /checkout/pay' },
              { value: '/dashboard', label: '仪表盘 /dashboard' },
            ]}
          />
          <Radio.Group value={device} onChange={(e) => setDevice(e.target.value)} size="small">
            <Radio.Button value="desktop">Desktop</Radio.Button>
            <Radio.Button value="mobile">Mobile</Radio.Button>
          </Radio.Group>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={loadData}>
            刷新热力图
          </Button>
        </Space>
      }
    >
      {heatmap ? (
        <div>
          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col span={8}>
              <Card size="small">
                <Statistic title="页面累计点击量" value={heatmap.total_clicks} suffix="次" />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="最高热力密集度"
                  value={heatmap.max_intensity}
                  suffix="%"
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="热力探针采样点数"
                  value={heatmap.points.length}
                  suffix="个热点"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
          </Row>

          <Card
            style={{
              backgroundColor: '#1f1f1f',
              color: '#fff',
              padding: '40px 20px',
              textAlign: 'center',
              borderRadius: 8,
              position: 'relative',
              overflow: 'hidden',
              minHeight: 280,
            }}
          >
            <FireOutlined style={{ fontSize: 44, color: '#ff4d4f', marginBottom: 12 }} />
            <Title level={4} style={{ color: '#fff' }}>
              热力图冷热分布渲染层 (Canvas Density Map)
            </Title>
            <Text style={{ color: '#bfbfbf' }}>
              当前探查页面: {heatmap.page_url} ｜ 终端设备: {heatmap.device}
            </Text>

            <div style={{ marginTop: 24, textAlign: 'left' }}>
              <Text strong style={{ color: '#fff' }}>
                核心热点区域坐标分布:
              </Text>
              <div style={{ marginTop: 10 }}>
                {heatmap.points.map((pt, i) => (
                  <Tag
                    key={String(i)}
                    color={pt.value >= 90 ? 'red' : pt.value >= 70 ? 'orange' : 'blue'}
                    style={{ margin: '4px 8px' }}
                  >
                    坐标 (x:{pt.x}, y:{pt.y}) — 热度: {pt.value}%
                  </Tag>
                ))}
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <Empty description="暂无热力图数据" />
      )}
    </Card>
  );
}

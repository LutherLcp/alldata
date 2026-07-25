/**
 * AI 助手页面 — 智能对话 + 洞察分析 + 异常检测
 * 左侧：会话历史列表
 * 右侧：聊天界面（消息列表 + 输入框）
 * 支持流式/非流式对话、模型切换
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Layout, Card, Input, Button, Space, Typography, Select, Avatar, Tooltip,
  List, Popconfirm, Empty, Switch, Tag, message,
} from 'antd';
import {
  SendOutlined, PlusOutlined, DeleteOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, RobotOutlined, UserOutlined, ThunderboltOutlined,
  ClearOutlined, SettingOutlined, BulbOutlined,
} from '@ant-design/icons';
import { useAIStore, type ChatSession } from '@/stores/ai-store';
import { useGlobalStore } from '@/stores/global';
import InsightCard from '@/components/ai/insight-card';
import AnomalyAlert from '@/components/ai/anomaly-alert';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;
const { Sider, Content } = Layout;

/** 快捷指令 */
const QUICK_COMMANDS = [
  { label: '分析趋势', icon: <ThunderboltOutlined />, prompt: '请分析当前项目的数据趋势，找出关键变化' },
  { label: '异常检测', icon: <BulbOutlined />, prompt: '请检测最近的数据是否存在异常波动' },
  { label: '生成洞察', icon: <RobotOutlined />, prompt: '请基于当前看板数据生成智能洞察' },
];

export default function AIAssistantPage() {
  const currentProject = useGlobalStore((s) => s.currentProject);
  const projectId = currentProject?.id;

  const {
    sessions, currentSessionId, isGenerating, streamingContent,
    sidebarOpen, selectedModel, availableModels,
    getCurrentMessages, createSession, switchSession, deleteSession,
    clearHistory, sendStreamMessage, sendMessage,
    toggleSidebar, setModel, loadModels,
  } = useAIStore();

  const [inputValue, setInputValue] = useState('');
  const [useStream, setUseStream] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  // 加载模型列表
  useEffect(() => { loadModels(); }, [loadModels]);

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const messages = getCurrentMessages();

  useEffect(() => { scrollToBottom(); }, [messages, streamingContent, scrollToBottom]);

  // 发送消息
  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || isGenerating) return;

    setInputValue('');
    try {
      if (useStream) {
        await sendStreamMessage(content);
      } else {
        await sendMessage(content);
      }
    } catch {
      message.error('发送失败，请重试');
    }
    inputRef.current?.focus();
  };

  // 快捷指令
  const handleQuickCommand = (prompt: string) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  // 新建会话
  const handleNewSession = () => {
    createSession();
    setInputValue('');
  };

  // Enter 发送（Shift+Enter 换行）
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 当前会话
  const currentSession = sessions.find((s) => s.id === currentSessionId);

  // 渲染消息内容（支持 Markdown 简单渲染）
  const renderContent = (content: string) => {
    // 简单换行渲染
    return content.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < content.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <Layout style={{ height: 'calc(100vh - 120px)', background: '#f5f5f5' }}>
      {/* 左侧：会话历史 */}
      <Sider
        width={280}
        style={{ background: '#fff', borderRight: '1px solid #f0f0f0', overflow: 'auto' }}
        trigger={null}
        collapsible
        collapsed={!sidebarOpen}
        collapsedWidth={0}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
          <Button type="primary" icon={<PlusOutlined />} block onClick={handleNewSession}
            style={{ background: '#722ED1', borderColor: '#722ED1' }}>
            新建对话
          </Button>
        </div>

        <List
          dataSource={sessions}
          locale={{ emptyText: <Empty description="暂无对话" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          renderItem={(session: ChatSession) => (
            <List.Item
              key={session.id}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                background: session.id === currentSessionId ? '#f9f0ff' : 'transparent',
                borderLeft: session.id === currentSessionId ? '3px solid #722ED1' : '3px solid transparent',
              }}
              onClick={() => switchSession(session.id)}
              actions={[
                <Popconfirm key="del" title="确认删除此对话?" onConfirm={(e) => { e?.stopPropagation(); deleteSession(session.id); }}>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()} />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar size="small" icon={<RobotOutlined />} style={{ background: '#722ED1' }} />}
                title={<Text ellipsis style={{ fontSize: 13, maxWidth: 160 }}>{session.title}</Text>}
                description={<Text type="secondary" style={{ fontSize: 11 }}>
                  {new Date(session.created_at).toLocaleDateString('zh-CN')} · {session.messages.length} 条
                </Text>}
              />
            </List.Item>
          )}
        />

        {sessions.length > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0' }}>
            <Popconfirm title="确认清空所有对话历史?" onConfirm={clearHistory}>
              <Button type="link" danger size="small" icon={<ClearOutlined />} block>清空历史</Button>
            </Popconfirm>
          </div>
        )}
      </Sider>

      {/* 右侧：聊天区域 */}
      <Content style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 顶部工具栏 */}
        <div style={{
          padding: '8px 16px', background: '#fff', borderBottom: '1px solid #f0f0f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Space>
            <Button type="text" icon={sidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
              onClick={toggleSidebar} />
            <Text strong style={{ fontSize: 15 }}>
              <RobotOutlined style={{ marginRight: 8, color: '#722ED1' }} />
              AI 智能助手
            </Text>
            {currentSession && (
              <Tag color="purple" style={{ marginLeft: 8 }}>{currentSession.title}</Tag>
            )}
          </Space>

          <Space>
            <Tooltip title={useStream ? '流式模式（实时输出）' : '非流式模式（等待完整响应）'}>
              <Switch size="small" checked={useStream} onChange={setUseStream}
                checkedChildren="流式" unCheckedChildren="完整" />
            </Tooltip>
            <Select
              value={selectedModel || undefined}
              onChange={setModel}
              placeholder="选择模型"
              style={{ width: 180 }}
              size="small"
              options={availableModels.map((m) => ({
                value: m.id,
                label: `${m.name} (${m.provider})`,
              }))}
              suffixIcon={<SettingOutlined />}
            />
          </Space>
        </div>

        {/* 消息列表 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
          {/* AI 洞察卡片 */}
          {projectId && (
            <InsightCard projectId={projectId} style={{ marginBottom: 16 }} />
          )}

          {/* 异常告警 */}
          <AnomalyAlert metricName="DAU" style={{ marginBottom: 16 }} />

          {/* 无消息时显示欢迎界面 */}
          {messages.length === 0 && !isGenerating && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <RobotOutlined style={{ fontSize: 64, color: '#722ED1', marginBottom: 24 }} />
              <Paragraph style={{ fontSize: 18, color: '#333', marginBottom: 8 }}>
                你好，我是 AllData AI 智能助手
              </Paragraph>
              <Paragraph type="secondary" style={{ marginBottom: 32 }}>
                我可以帮你分析数据趋势、检测异常、生成洞察报告，或直接回答数据相关问题
              </Paragraph>

              <Space wrap>
                {QUICK_COMMANDS.map((cmd) => (
                  <Button key={cmd.label} icon={cmd.icon} onClick={() => handleQuickCommand(cmd.prompt)}
                    style={{ borderColor: '#722ED1', color: '#722ED1' }}>
                    {cmd.label}
                  </Button>
                ))}
              </Space>
            </div>
          )}

          {/* 消息列表 */}
          {messages.map((msg, idx) => (
            <div key={idx} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 16,
            }}>
              {msg.role !== 'user' && (
                <Avatar size="small" icon={<RobotOutlined />}
                  style={{ background: '#722ED1', marginRight: 12, flexShrink: 0 }} />
              )}
              <Card
                size="small"
                style={{
                  maxWidth: '70%',
                  background: msg.role === 'user' ? '#722ED1' : '#fff',
                  borderColor: msg.role === 'user' ? '#722ED1' : '#e8e8e8',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                }}
                bodyStyle={{
                  padding: '10px 16px',
                  color: msg.role === 'user' ? '#fff' : '#333',
                }}
              >
                <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}>
                  {renderContent(msg.content)}
                </div>
              </Card>
              {msg.role === 'user' && (
                <Avatar size="small" icon={<UserOutlined />}
                  style={{ background: '#1890ff', marginLeft: 12, flexShrink: 0 }} />
              )}
            </div>
          ))}

          {/* 流式输出中 */}
          {isGenerating && streamingContent && (
            <div style={{ display: 'flex', marginBottom: 16 }}>
              <Avatar size="small" icon={<RobotOutlined />}
                style={{ background: '#722ED1', marginRight: 12, flexShrink: 0 }} />
              <Card size="small"
                style={{ maxWidth: '70%', borderColor: '#d9d9d9', borderRadius: '16px 16px 16px 4px' }}
                bodyStyle={{ padding: '10px 16px' }}>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}>
                  {streamingContent}
                  <span style={{ display: 'inline-block', width: 6, height: 16, background: '#722ED1', marginLeft: 2, animation: 'blink 1s infinite' }} />
                </div>
              </Card>
            </div>
          )}

          {/* 加载中（无流式内容时） */}
          {isGenerating && !streamingContent && (
            <div style={{ display: 'flex', marginBottom: 16 }}>
              <Avatar size="small" icon={<RobotOutlined />}
                style={{ background: '#722ED1', marginRight: 12, flexShrink: 0 }} />
              <Card size="small"
                style={{ borderColor: '#d9d9d9', borderRadius: '16px 16px 16px 4px' }}
                bodyStyle={{ padding: '10px 16px' }}>
                <Text type="secondary">思考中...</Text>
              </Card>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div style={{ padding: '12px 24px 16px', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <TextArea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的问题... (Enter 发送, Shift+Enter 换行)"
              autoSize={{ minRows: 1, maxRows: 4 }}
              disabled={isGenerating}
              style={{ borderRadius: 8 }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={isGenerating}
              disabled={!inputValue.trim()}
              style={{ height: 40, width: 40, borderRadius: 8, background: '#722ED1', borderColor: '#722ED1' }}
            />
          </div>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space size={4}>
              {QUICK_COMMANDS.map((cmd) => (
                <Button key={cmd.label} type="link" size="small" icon={cmd.icon}
                  onClick={() => handleQuickCommand(cmd.prompt)}
                  style={{ color: '#722ED1', fontSize: 12 }}>
                  {cmd.label}
                </Button>
              ))}
            </Space>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {availableModels.length > 0 ? `当前模型: ${selectedModel || availableModels[0]?.name}` : '模型加载中...'}
            </Text>
          </div>
        </div>
      </Content>

      {/* 光标闪烁动画 */}
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </Layout>
  );
}

import {
  type PluginTestResult,
  type SDKBuildResult,
  type TenantPluginItem,
  marketplaceApi,
} from '@/services/marketplace';
import { useGlobalStore } from '@/stores/global';
import type { SDKPlatform } from '@alldata/shared';
import {
  ApiOutlined,
  AppstoreOutlined,
  BuildOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DashboardOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RobotOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';

const { Title, Text, Paragraph } = Typography;

const CATEGORY_NAMES: Record<string, string> = {
  all: '全部插件',
  messaging: '消息机器人',
  ecommerce: '电商流转',
  crm: '客户 CRM',
  webhook: 'HTTP Webhook',
  analytics: '数仓 Sidecar',
};

export default function MarketplacePage() {
  const currentProject = useGlobalStore((s) => s.currentProject);
  const projectId = currentProject?.id || 1;

  const [activeTab, setActiveTab] = useState('sdk');

  // SDK 构建配置状态
  const [platform, setPlatform] = useState<SDKPlatform>('web_js');
  const [autoPv, setAutoPv] = useState(true);
  const [autoClick, setAutoClick] = useState(true);
  const [encrypt, setEncrypt] = useState(false);
  const [useBeacon, setUseBeacon] = useState(true);
  const [building, setBuilding] = useState(false);
  const [sdkResult, setSdkResult] = useState<SDKBuildResult | null>(null);

  // 插件市场状态
  const [plugins, setPlugins] = useState<TenantPluginItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [pluginLoading, setPluginLoading] = useState(false);

  // 插件配置弹窗
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<TenantPluginItem | null>(null);
  const [configForm] = Form.useForm();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<PluginTestResult | null>(null);

  const fetchPlugins = useCallback(async () => {
    setPluginLoading(true);
    try {
      const data = await marketplaceApi.listPlugins(projectId);
      setPlugins(data || []);
    } catch {
      message.error('加载插件列表失败');
    } finally {
      setPluginLoading(false);
    }
  }, [projectId]);

  const handleBuildSDK = useCallback(async () => {
    setBuilding(true);
    try {
      const data = await marketplaceApi.buildSDK({
        platform,
        enable_auto_pv: autoPv,
        enable_auto_click: autoClick,
        enable_encrypt: encrypt,
        enable_beacon: useBeacon,
        batch_interval_ms: 3000,
        batch_max_size: 10,
      });

      if (data) {
        setSdkResult(data);
        message.success(`SDK 编译成功！代码体积仅 ${data.bundleSizeKB} KB`);
      }
    } catch {
      message.error('SDK 编译失败');
    } finally {
      setBuilding(false);
    }
  }, [platform, autoPv, autoClick, encrypt, useBeacon]);

  useEffect(() => {
    fetchPlugins();
    handleBuildSDK();
  }, [fetchPlugins, handleBuildSDK]);

  const copyCode = () => {
    if (sdkResult?.code) {
      navigator.clipboard.writeText(sdkResult.code);
      message.success('SDK 源代码已成功复制到剪贴板！');
    }
  };

  // ─── 插件安装 / 卸载 / 配置 ───
  const handleInstall = async (plugin: TenantPluginItem) => {
    try {
      await marketplaceApi.installPlugin(projectId, plugin.id, {});
      message.success(`成功安装并启用插件 [${plugin.name}]`);
      fetchPlugins();
    } catch {
      message.error('安装插件失败');
    }
  };

  const handleUninstall = async (plugin: TenantPluginItem) => {
    try {
      await marketplaceApi.uninstallPlugin(projectId, plugin.id);
      message.success(`已卸载插件 [${plugin.name}]`);
      fetchPlugins();
    } catch {
      message.error('卸载插件失败');
    }
  };

  const openConfigModal = (plugin: TenantPluginItem) => {
    setSelectedPlugin(plugin);
    setTestResult(null);
    configForm.setFieldsValue(plugin.config || {});
    setConfigModalOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedPlugin) return;
    const values = await configForm.validateFields();
    try {
      await marketplaceApi.updateConfig(projectId, selectedPlugin.id, values);
      message.success('插件配置已保存');
      setConfigModalOpen(false);
      fetchPlugins();
    } catch {
      message.error('保存配置失败');
    }
  };

  const handleTestPing = async () => {
    if (!selectedPlugin) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await marketplaceApi.testPlugin(projectId, selectedPlugin.id, {
        trigger: 'manual_ping',
      });
      setTestResult(res);
      message.success('连通性测试执行完毕');
      fetchPlugins();
    } catch {
      message.error('连通性测试失败');
    } finally {
      setTesting(false);
    }
  };

  const filteredPlugins =
    categoryFilter === 'all' ? plugins : plugins.filter((p) => p.category === categoryFilter);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'messaging':
        return <RobotOutlined />;
      case 'ecommerce':
        return <ShoppingOutlined />;
      case 'crm':
        return <TeamOutlined />;
      case 'webhook':
        return <ApiOutlined />;
      case 'analytics':
        return <DashboardOutlined />;
      default:
        return <AppstoreOutlined />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card size="small" style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              <BuildOutlined style={{ color: '#1890ff', marginRight: 8 }} />
              SDK 动态编译工厂 & 开发者生态市场
            </Title>
            <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
              根据业务需求自由勾选功能模块，在线打出超轻量 SDK (&lt;10KB)，或探索开放平台多租户
              Sidecar 与 Webhook 扩展插件
            </Paragraph>
          </div>
          <Space>
            <Tag color="cyan">当前租户项目: #{projectId}</Tag>
          </Space>
        </div>
      </Card>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        items={[
          {
            key: 'sdk',
            label: (
              <span>
                <BuildOutlined /> 在线 SDK 动态编译工厂 (SDK Factory)
              </span>
            ),
            children: (
              <Row gutter={16}>
                <Col span={10}>
                  <Card title="1. 勾选定制编译选项" style={{ borderRadius: 12 }}>
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                      <div>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>
                          选择目标客户端平台：
                        </Text>
                        <Select
                          size="large"
                          style={{ width: '100%' }}
                          value={platform}
                          onChange={setPlatform}
                          options={[
                            { label: 'Web JavaScript (通用浏览器)', value: 'web_js' },
                            { label: '微信小程序 / 支付宝小程序', value: 'wechat_mp' },
                            { label: 'iOS Native (Swift / ObjC)', value: 'ios_swift' },
                            { label: 'Android Native (Kotlin / Java)', value: 'android_kotlin' },
                            { label: 'Flutter 跨端 SDK', value: 'flutter' },
                            { label: 'React Native 极速版', value: 'react_native' },
                          ]}
                        />
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <Text strong>自动全埋点 $pageview 页面浏览事件</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            自动监听 URL 变化与 PV 埋点
                          </Text>
                        </div>
                        <Switch checked={autoPv} onChange={setAutoPv} />
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <Text strong>自动捕获 $click 全局无痕点击</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            自动识别按钮/链接点击无埋点收集
                          </Text>
                        </div>
                        <Switch checked={autoClick} onChange={setAutoClick} />
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <Text strong>启用 navigator.sendBeacon 离场传输</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            保证页面关闭/离开时零数据丢失
                          </Text>
                        </div>
                        <Switch checked={useBeacon} onChange={setUseBeacon} />
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <Text strong>传输 Payload AES 混淆加密</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            防抓包分析与恶意数据伪造
                          </Text>
                        </div>
                        <Switch checked={encrypt} onChange={setEncrypt} />
                      </div>

                      <Button
                        type="primary"
                        size="large"
                        icon={<BuildOutlined />}
                        loading={building}
                        onClick={handleBuildSDK}
                        block
                      >
                        立即重新编译 SDK (Build Factory)
                      </Button>
                    </Space>
                  </Card>
                </Col>

                <Col span={14}>
                  <Card
                    title={
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>2. 编译生成的 SDK 产物</span>
                        {sdkResult && (
                          <Tag color="green" style={{ fontSize: 13, padding: '2px 8px' }}>
                            包体积: <strong>{sdkResult.bundleSizeKB} KB</strong> (&lt;10KB 极轻量)
                          </Tag>
                        )}
                      </div>
                    }
                    extra={
                      <Space>
                        <Button icon={<CopyOutlined />} onClick={copyCode}>
                          复制代码
                        </Button>
                      </Space>
                    }
                    style={{ borderRadius: 12 }}
                  >
                    {sdkResult ? (
                      <Input.TextArea
                        value={sdkResult.code}
                        rows={16}
                        readOnly
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 12,
                          backgroundColor: '#f5f5f5',
                        }}
                      />
                    ) : (
                      <Text type="secondary">正在编译代码...</Text>
                    )}
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'marketplace',
            label: (
              <span>
                <AppstoreOutlined /> 开发者插件生态市场 (App Marketplace)
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Card size="small" style={{ borderRadius: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Radio.Group
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      buttonStyle="solid"
                    >
                      <Radio.Button value="all">全部插件</Radio.Button>
                      <Radio.Button value="messaging">消息机器人</Radio.Button>
                      <Radio.Button value="ecommerce">电商流转</Radio.Button>
                      <Radio.Button value="crm">客户 CRM</Radio.Button>
                      <Radio.Button value="webhook">HTTP Webhook</Radio.Button>
                      <Radio.Button value="analytics">数仓 Sidecar</Radio.Button>
                    </Radio.Group>
                    <Button
                      icon={<ReloadOutlined />}
                      loading={pluginLoading}
                      onClick={fetchPlugins}
                    >
                      刷新列表
                    </Button>
                  </div>
                </Card>

                <Row gutter={[16, 16]}>
                  {filteredPlugins.map((plugin) => (
                    <Col span={12} key={plugin.id}>
                      <Card
                        size="small"
                        style={{ borderRadius: 12 }}
                        hoverable
                        actions={[
                          plugin.is_installed ? (
                            <Button
                              type="link"
                              key="config"
                              icon={<SettingOutlined />}
                              onClick={() => openConfigModal(plugin)}
                            >
                              配置运行参数
                            </Button>
                          ) : (
                            <Button
                              type="link"
                              key="install"
                              icon={<CheckCircleOutlined />}
                              onClick={() => handleInstall(plugin)}
                            >
                              一键安装并启用
                            </Button>
                          ),
                          plugin.is_installed ? (
                            <Popconfirm
                              title={`确认卸载插件 [${plugin.name}]?`}
                              key="uninstall"
                              onConfirm={() => handleUninstall(plugin)}
                            >
                              <Button type="link" danger icon={<DeleteOutlined />}>
                                卸载插件
                              </Button>
                            </Popconfirm>
                          ) : (
                            <span key="desc" style={{ color: '#bfbfbf', fontSize: 12 }}>
                              尚未在当前项目激活
                            </span>
                          ),
                        ]}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                          }}
                        >
                          <Space size="middle">
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 8,
                                backgroundColor: plugin.is_installed ? '#f6ffed' : '#e6f7ff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 22,
                                color: plugin.is_installed ? '#52c41a' : '#1890ff',
                              }}
                            >
                              {getCategoryIcon(plugin.category)}
                            </div>
                            <div>
                              <Text strong style={{ fontSize: 15 }}>
                                {plugin.name}
                              </Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                由 {plugin.author} 提供 • v{plugin.version}
                              </Text>
                            </div>
                          </Space>
                          <Space>
                            <Tag>{CATEGORY_NAMES[plugin.category] || plugin.category}</Tag>
                            <Badge
                              status={plugin.is_installed ? 'success' : 'default'}
                              text={plugin.is_installed ? '已启用' : '未安装'}
                            />
                          </Space>
                        </div>
                        <Paragraph
                          type="secondary"
                          style={{ marginTop: 12, marginBottom: 8, fontSize: 13, minHeight: 38 }}
                        >
                          {plugin.description}
                        </Paragraph>
                        {plugin.is_installed && plugin.last_tested_at && (
                          <div style={{ fontSize: 12, color: '#52c41a' }}>
                            <CheckCircleOutlined style={{ marginRight: 4 }} />
                            连通状态: 健康 (最近测试:{' '}
                            {new Date(plugin.last_tested_at).toLocaleTimeString()})
                          </div>
                        )}
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            ),
          },
        ]}
      />

      {/* 插件参数配置与连通性测试弹窗 */}
      <Modal
        title={`配置插件: ${selectedPlugin?.name || ''}`}
        open={configModalOpen}
        onOk={handleSaveConfig}
        onCancel={() => setConfigModalOpen(false)}
        width={650}
        destroyOnClose
      >
        {selectedPlugin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="插件唯一标识">{selectedPlugin.id}</Descriptions.Item>
              <Descriptions.Item label="类别">
                {CATEGORY_NAMES[selectedPlugin.category] || selectedPlugin.category}
              </Descriptions.Item>
              <Descriptions.Item label="版本号">v{selectedPlugin.version}</Descriptions.Item>
              <Descriptions.Item label="提供方">{selectedPlugin.author}</Descriptions.Item>
            </Descriptions>

            <Form form={configForm} layout="vertical">
              {selectedPlugin.category === 'messaging' && (
                <>
                  <Form.Item
                    name="webhook_url"
                    label="群机器人 Webhook URL"
                    rules={[{ required: true, message: '请输入 Webhook 地址' }]}
                  >
                    <Input placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." />
                  </Form.Item>
                  <Form.Item name="secret_token" label="安全密钥 (Secret)">
                    <Input.Password placeholder="可选签名密钥" />
                  </Form.Item>
                </>
              )}

              {selectedPlugin.category === 'ecommerce' && (
                <>
                  <Form.Item
                    name="store_domain"
                    label="店铺域名 (Store Domain)"
                    rules={[{ required: true, message: '请输入店铺域名' }]}
                  >
                    <Input placeholder="my-shop.myshopify.com" />
                  </Form.Item>
                  <Form.Item name="api_access_token" label="API Access Token">
                    <Input.Password placeholder="shpat_..." />
                  </Form.Item>
                </>
              )}

              {selectedPlugin.category === 'crm' && (
                <>
                  <Form.Item name="crm_type" label="CRM 供应商" initialValue="salesforce">
                    <Select
                      options={[
                        { label: 'Salesforce CRM', value: 'salesforce' },
                        { label: 'HubSpot', value: 'hubspot' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="client_id" label="OAuth Client ID">
                    <Input placeholder="OAuth Client ID" />
                  </Form.Item>
                  <Form.Item name="client_secret" label="OAuth Client Secret">
                    <Input.Password placeholder="Client Secret" />
                  </Form.Item>
                </>
              )}

              {selectedPlugin.category === 'webhook' && (
                <>
                  <Form.Item
                    name="endpoint_url"
                    label="目标 HTTP API 端点"
                    rules={[{ required: true, message: '请输入端点地址' }]}
                  >
                    <Input placeholder="https://api.mycorp.com/v1/event-sink" />
                  </Form.Item>
                  <Form.Item name="http_method" label="请求方法" initialValue="POST">
                    <Select
                      options={[
                        { label: 'POST', value: 'POST' },
                        { label: 'PUT', value: 'PUT' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="custom_headers" label="自定义请求头 (JSON)">
                    <Input.TextArea rows={2} placeholder='{"X-Custom-Auth": "token-xyz"}' />
                  </Form.Item>
                </>
              )}

              {selectedPlugin.category === 'analytics' && (
                <>
                  <Form.Item
                    name="max_execution_time_sec"
                    label="慢查询阻断阈值 (秒)"
                    initialValue={30}
                  >
                    <Input type="number" />
                  </Form.Item>
                  <Form.Item name="alert_channel" label="告警通知渠道" initialValue="webhook">
                    <Input placeholder="webhook / log" />
                  </Form.Item>
                </>
              )}
            </Form>

            <Divider style={{ margin: '8px 0' }} />

            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <Text strong>沙箱模拟分发与连通性自测 (Test Ping)</Text>
                <Button
                  size="small"
                  type="dashed"
                  icon={<PlayCircleOutlined />}
                  loading={testing}
                  onClick={handleTestPing}
                >
                  运行连通性测试
                </Button>
              </div>

              {testResult && (
                <Alert
                  type={testResult.success ? 'success' : 'error'}
                  showIcon
                  message={testResult.message}
                  description={
                    <div style={{ fontSize: 12 }}>
                      <div>响应耗时: {testResult.latencyMs} ms</div>
                      <div>执行时间: {new Date(testResult.testedAt).toLocaleString()}</div>
                    </div>
                  }
                />
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

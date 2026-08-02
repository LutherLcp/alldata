/**
 * SDK 编译工厂与开发者生态插件市场中心
 */
import { useEffect, useState } from 'react';
import { Card, Row, Col, Switch, Button, Tag, Tabs, Select, Typography, Space, Input, message } from 'antd';
import { AppstoreOutlined, BuildOutlined, CopyOutlined, ApiOutlined } from '@ant-design/icons';
import request from '@/services-new/request';
import type { SDKPlatform, AppPlugin } from '@alldata/shared';

const { Title, Text, Paragraph } = Typography;

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState('sdk');

  // SDK 构建配置状态
  const [platform, setPlatform] = useState<SDKPlatform>('web_js');
  const [autoPv, setAutoPv] = useState(true);
  const [autoClick, setAutoClick] = useState(true);
  const [encrypt, setEncrypt] = useState(false);
  const [useBeacon, setUseBeacon] = useState(true);
  const [building, setBuilding] = useState(false);
  const [sdkResult, setSdkResult] = useState<{ code: string; bundleSizeKB: number; fileName: string } | null>(null);

  // 插件市场状态
  const [plugins, setPlugins] = useState<AppPlugin[]>([]);

  const handleBuildSDK = async () => {
    setBuilding(true);
    try {
      const res = await request.post('/marketplace/sdk/build', {
        platform,
        enable_auto_pv: autoPv,
        enable_auto_click: autoClick,
        enable_encrypt: encrypt,
        enable_beacon: useBeacon,
        batch_interval_ms: 3000,
        batch_max_size: 10,
      });

      if (res.data?.code === 200 && res.data.data) {
        setSdkResult(res.data.data);
        message.success(`SDK 编译成功！代码体积仅 ${res.data.data.bundleSizeKB} KB`);
      }
    } catch {
      message.error('SDK 编译失败');
    } finally {
      setBuilding(false);
    }
  };

  const fetchPlugins = async () => {
    try {
      const res = await request.get('/marketplace/plugins');
      if (res.data?.code === 200 && res.data.data) {
        setPlugins(res.data.data);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchPlugins();
    handleBuildSDK(); // 初始化构建一次
  }, []);

  const copyCode = () => {
    if (sdkResult?.code) {
      navigator.clipboard.writeText(sdkResult.code);
      message.success('SDK 源代码已成功复制到剪贴板！');
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
              根据业务需求自由勾选功能模块，在线打出超轻量 SDK (&lt;10KB)，或探索开放平台 App 扩展插件
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
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>选择目标客户端平台：</Text>
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

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong>自动全埋点 $pageview 页面浏览事件</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>自动监听 URL 变化与 PV 埋点</Text>
                        </div>
                        <Switch checked={autoPv} onChange={setAutoPv} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong>自动捕获 $click 全局无痕点击</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>自动识别按钮/链接点击无埋点收集</Text>
                        </div>
                        <Switch checked={autoClick} onChange={setAutoClick} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong>启用 navigator.sendBeacon 离场传输</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>保证页面关闭/关掉时零数据丢失</Text>
                        </div>
                        <Switch checked={useBeacon} onChange={setUseBeacon} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong>传输 Payload AES 混淆加密</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>防抓包分析与恶意数据伪造</Text>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                        <Button icon={<CopyOutlined />} onClick={copyCode}>复制代码</Button>
                      </Space>
                    }
                    style={{ borderRadius: 12 }}
                  >
                    {sdkResult ? (
                      <Input.TextArea
                        value={sdkResult.code}
                        rows={16}
                        readOnly
                        style={{ fontFamily: 'monospace', fontSize: 12, backgroundColor: '#f5f5f5' }}
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
              <Row gutter={[16, 16]}>
                {plugins.map((plugin) => (
                  <Col span={12} key={plugin.id}>
                    <Card size="small" style={{ borderRadius: 12 }} hoverable>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Space size="middle">
                          <div style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#e6f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#1890ff' }}>
                            <ApiOutlined />
                          </div>
                          <div>
                            <Text strong style={{ fontSize: 15 }}>{plugin.name}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>由 {plugin.author} 提供 • v{plugin.version}</Text>
                          </div>
                        </Space>
                        <Tag color={plugin.is_installed ? 'green' : 'blue'}>
                          {plugin.is_installed ? '已启用' : '未安装'}
                        </Tag>
                      </div>
                      <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 12, fontSize: 13, minHeight: 38 }}>
                        {plugin.description}
                      </Paragraph>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type={plugin.is_installed ? 'default' : 'primary'} size="small">
                          {plugin.is_installed ? '配置插件' : '一键安装'}
                        </Button>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            ),
          },
        ]}
      />
    </div>
  );
}

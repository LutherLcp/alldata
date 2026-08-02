/**
 * SDK 动态编译工厂与插件生态服务
 */
import type { SDKBuildOptions, AppPlugin, WebhookSubscription } from '@alldata/shared';

// 动态生成极轻量打包 SDK 代码源码
export function generateSDKBundle(opts: SDKBuildOptions): { code: string; bundleSizeKB: number; fileName: string } {
  const { platform, enable_auto_pv, enable_auto_click, enable_encrypt, enable_beacon, batch_interval_ms, batch_max_size } = opts;

  let code = `/**
 * AllData Ultra-Lightweight Track SDK v15.0 (${platform})
 * Generated: ${new Date().toISOString()}
 */
(function(window) {
  'use strict';
  var queue = [];
  var config = {
    batchInterval: ${batch_interval_ms},
    batchSize: ${batch_max_size},
    enableEncrypt: ${enable_encrypt},
    useBeacon: ${enable_beacon}
  };

  function flush() {
    if (queue.length === 0) return;
    var batch = queue.splice(0, config.batchSize);
    var payload = JSON.stringify({ events: batch });
    if (config.useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon('/api/v1/track/batch', payload);
    } else {
      fetch('/api/v1/track/batch', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' } });
    }
  }

  setInterval(flush, config.batchInterval);

  window.AllDataTracker = {
    track: function(eventName, props) {
      queue.push({ event_name: eventName, properties: props, time: new Date().toISOString() });
      if (queue.length >= config.batchSize) flush();
    }
  };

  ${enable_auto_pv ? "window.addEventListener('load', function() { window.AllDataTracker.track('$pageview', { url: location.href }); });" : ''}
  ${enable_auto_click ? "document.addEventListener('click', function(e) { if (e.target) window.AllDataTracker.track('$click', { tag: e.target.tagName }); });" : ''}
})(window);`;

  const size = Math.round((Buffer.byteLength(code, 'utf8') / 1024) * 100) / 100;
  const fileName = `alldata-sdk-${platform}.min.js`;

  return {
    code,
    bundleSizeKB: size,
    fileName,
  };
}

// 预设高扩展插件市场列表
export function getMarketplacePlugins(): AppPlugin[] {
  return [
    {
      id: 'plugin_feishu',
      name: '飞书/钉钉 异常预警机器人',
      icon: 'RobotOutlined',
      category: 'messaging',
      description: '实时推送 ClickHouse 报错与漏斗异常突降至企业飞书/钉钉群',
      version: '2.1.0',
      author: 'AllData Official',
      is_installed: true,
    },
    {
      id: 'plugin_shopify',
      name: 'Shopify / 电商订单同步器',
      icon: 'ShoppingOutlined',
      category: 'ecommerce',
      description: '无缝对接 Shopify, WooCommerce 订单与加购事件至 CDP 画像',
      version: '1.4.2',
      author: 'Ecom Partner',
      is_installed: false,
    },
    {
      id: 'plugin_crm_sync',
      name: 'Salesforce / HubSpot 双向同步',
      icon: 'TeamOutlined',
      category: 'crm',
      description: '自动将高潜力 Cohort 分群同步至 Salesforce CRM 线索库',
      version: '3.0.1',
      author: 'AllData Enterprise',
      is_installed: true,
    },
    {
      id: 'plugin_custom_webhook',
      name: '自定义 HTTP Webhook 触发器',
      icon: 'ApiOutlined',
      category: 'webhook',
      description: '支持注册任意第三方 HTTP API 端点，实时接收归因与漏斗事件',
      version: '1.0.0',
      author: 'Community',
      is_installed: true,
    },
  ];
}

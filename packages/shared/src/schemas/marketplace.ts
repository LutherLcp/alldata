/**
 * SDK 编译工厂与开发者插件生态 Schema 规约
 */
import { z } from 'zod';

export const sdkPlatformSchema = z.enum(['web_js', 'wechat_mp', 'ios_swift', 'android_kotlin', 'flutter', 'react_native']);

export type SDKPlatform = z.infer<typeof sdkPlatformSchema>;

export const sdkBuildOptionsSchema = z.object({
  platform: sdkPlatformSchema.default('web_js'),
  enable_auto_pv: z.boolean().default(true),
  enable_auto_click: z.boolean().default(true),
  enable_encrypt: z.boolean().default(false),
  enable_beacon: z.boolean().default(true),
  batch_interval_ms: z.number().default(3000),
  batch_max_size: z.number().default(10),
});

export type SDKBuildOptions = z.infer<typeof sdkBuildOptionsSchema>;

export const appPluginSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  category: z.enum(['crm', 'messaging', 'ecommerce', 'analytics', 'webhook']),
  description: z.string(),
  version: z.string(),
  author: z.string(),
  is_installed: z.boolean().default(false),
  config_schema: z.record(z.unknown()).optional(),
});

export type AppPlugin = z.infer<typeof appPluginSchema>;

export const webhookSubscriptionSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().min(1).max(200),
  target_url: z.string().url(),
  secret_token: z.string().optional(),
  events: z.array(z.string()).min(1),
  is_active: z.boolean().default(true),
});

export type WebhookSubscription = z.infer<typeof webhookSubscriptionSchema>;

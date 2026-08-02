/**
 * 全渠道多触点归因 (Multi-Touch Attribution - MTA) Schema 规约
 */
import { z } from 'zod';
import { dateRangeSchema } from './common';

export const attributionModelTypeSchema = z.enum([
  'first_touch',
  'last_touch',
  'linear',
  'time_decay',
  'w_shaped',
  'u_shaped',
]);

export type AttributionModelType = z.infer<typeof attributionModelTypeSchema>;

export const touchpointSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  channel: z.string(), // 如 'douyin', 'xiaohongshu', 'wechat_ad', 'baidu_search'
  campaign: z.string().optional(),
  touch_time: z.string(),
  cost: z.number().default(0),
});

export type Touchpoint = z.infer<typeof touchpointSchema>;

export const channelROISchema = z.object({
  channel: z.string(),
  channel_name: z.string(),
  total_touchpoints: z.number(),
  attributed_conversions: z.number(),
  attributed_revenue: z.number(),
  total_cost: z.number(),
  roas: z.number(), // Return on Ad Spend (收益率)
  cac: z.number(),  // Customer Acquisition Cost (获客成本)
});

export type ChannelROI = z.infer<typeof channelROISchema>;

export const mtaEvaluateQuerySchema = dateRangeSchema.extend({
  model: attributionModelTypeSchema.default('last_touch'),
  conversion_event: z.string().default('payment_success'),
  time_decay_half_life_days: z.number().default(7),
});

export type MTAEvaluateQuery = z.infer<typeof mtaEvaluateQuerySchema>;

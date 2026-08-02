/**
 * @alldata/shared — 智能营销自动化 Flow Zod Schema
 */
import { z } from 'zod';

export const flowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['trigger', 'condition', 'action', 'split']),
  label: z.string().min(1),
  config: z.record(z.unknown()).optional(),
});

export const flowCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  trigger_type: z.enum(['event', 'cron', 'cohort']).default('event'),
  nodes: z.array(flowNodeSchema).min(1),
  edges: z.array(z.object({
    source: z.string(),
    target: z.string(),
    label: z.string().optional(),
  })).optional(),
});

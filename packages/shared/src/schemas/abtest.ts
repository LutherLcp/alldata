/**
 * @alldata/shared — A/B Testing & Feature Flags Zod Schema
 */
import { z } from 'zod';
import { filterConditionSchema } from './common';

export const featureFlagCreateSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  rollout_percentage: z.number().int().min(0).max(100).default(50),
  rules: z.array(filterConditionSchema).optional(),
});

export const abExperimentCreateSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().min(1).max(200),
  hypothesis: z.string().optional(),
  target_metric: z.string().min(1),
  variants: z.array(z.object({
    name: z.string(),
    weight: z.number().min(0).max(100),
    config: z.record(z.unknown()).optional(),
  })).min(2),
});

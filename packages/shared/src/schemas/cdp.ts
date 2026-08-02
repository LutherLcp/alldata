/**
 * @alldata/shared — CDP & 客户旅程 Zod Schema
 */
import { z } from 'zod';
import { dateRangeSchema, filterConditionSchema } from './common';

export const userProfileQuerySchema = z.object({
  user_id: z.string().min(1),
  project_id: z.coerce.number().int().positive(),
});

export const cohortCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  entity_type: z.enum(['user', 'device']).default('user'),
  rules: z.array(filterConditionSchema).min(1),
  refresh_cron: z.string().optional(),
});

export const journeyPathQuerySchema = z.object({
  project_id: z.coerce.number().int().positive(),
  date_range: dateRangeSchema,
  start_event: z.string().optional(),
  target_event: z.string().optional(),
  max_depth: z.number().int().min(2).max(10).default(5),
});

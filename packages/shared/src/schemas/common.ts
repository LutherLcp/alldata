/**
 * @alldata/shared — Common Zod Schemas
 */
import { z } from 'zod';

export const pageParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(200).default(20),
  keyword: z.string().optional(),
  sort_field: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

export const dateRangeSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  granularity: z.enum(['hour', 'day', 'week', 'month']).optional(),
});

export const filterConditionSchema = z.object({
  property: z.string().min(1),
  operator: z.enum([
    'eq', 'ne', 'gt', 'gte', 'lt', 'lte',
    'in', 'not_in', 'like', 'not_like',
    'is_null', 'is_not_null', 'between', 'not_between',
  ]),
  value: z.unknown(),
  data_type: z.enum(['string', 'number', 'date', 'boolean', 'array', 'object']).optional(),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

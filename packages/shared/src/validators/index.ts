import { z } from 'zod';

export const emailSchema = z.string().email('无效的邮箱格式').max(254);

export const passwordSchema = z
  .string()
  .min(8, '密码至少8位')
  .max(128, '密码过长')
  .regex(/[A-Z]/, '必须包含大写字母')
  .regex(/[a-z]/, '必须包含小写字母')
  .regex(/[0-9]/, '必须包含数字')
  .regex(/[^A-Za-z0-9]/, '必须包含特殊字符');

export const usernameSchema = z
  .string()
  .min(2, '用户名至少2位')
  .max(50, '用户名最多50位')
  .regex(/^[a-zA-Z0-9_-]+$/, '用户名只能包含字母、数字、下划线、连字符');

export const phoneSchema = z.string().regex(/^1[3-9]\d{9}$/, '无效的手机号格式');

export const urlSchema = z.string().url('无效的URL格式').max(2048);

export const uuidSchema = z.string().uuid('无效的UUID格式');

export const dateStringSchema = z.string().datetime({ offset: true });

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const sortSchema = z.object({
  field: z.string().min(1),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export const filterSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'like', 'nlike', 'between', 'is_null', 'is_not_null']),
  value: z.unknown(),
  logic: z.enum(['AND', 'OR']).optional(),
});

export const queryOptionsSchema = z.object({
  filters: z.array(filterSchema).optional(),
  sorts: z.array(sortSchema).optional(),
  pagination: paginationSchema.optional(),
  fields: z.array(z.string()).optional(),
});

export const idParamSchema = z.object({
  id: uuidSchema,
});

export const projectCodeParamSchema = z.object({
  code: z.string().min(2).max(50).regex(/^[a-zA-Z0-9_-]+$/),
});

export const createIdSchema = (fieldName = 'id') => z.object({
  [fieldName]: uuidSchema,
});

export const createPaginationSchema = () => paginationSchema;

export const createFilterSchema = <T extends z.ZodRawShape>(fields: T) =>
  z.object({
    filters: z.array(
      z.object({
        field: z.enum(Object.keys(fields) as [string, ...string[]]),
        operator: filterSchema.shape.operator,
        value: z.unknown(),
        logic: filterSchema.shape.logic,
      })
    ).optional(),
    sorts: z.array(
      z.object({
        field: z.enum(Object.keys(fields) as [string, ...string[]]),
        order: sortSchema.shape.order,
      })
    ).optional(),
    pagination: paginationSchema.optional(),
    fields: z.array(z.enum(Object.keys(fields) as [string, ...string[]])).optional(),
  });

export const fileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimetype: z.string().min(1),
  size: z.number().positive().max(100 * 1024 * 1024),
  encoding: z.string().optional(),
});

export const jsonSchema = z.record(z.unknown());

export const nonEmptyStringSchema = z.string().min(1, '不能为空').max(10000);

export const optionalStringSchema = z.string().max(10000).optional();

export const optionalNumberSchema = z.number().optional();

export const optionalBooleanSchema = z.boolean().optional();

export const optionalArraySchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.array(itemSchema).optional();

export const requiredArraySchema = <T extends z.ZodTypeAny>(itemSchema: T, min = 1) =>
  z.array(itemSchema).min(min, `至少需要 ${min} 项`);

export const nullableSchema = <T extends z.ZodTypeAny>(schema: T) => schema.nullable();

export const transformToDate = z.preprocess(
  (val) => (typeof val === 'string' || typeof val === 'number' ? new Date(val) : val),
  z.date()
);

export const transformToNumber = z.preprocess(
  (val) => (typeof val === 'string' ? Number(val) : val),
  z.number()
);

export const transformToBoolean = z.preprocess(
  (val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val === 'true' || val === '1';
    if (typeof val === 'number') return val !== 0;
    return false;
  },
  z.boolean()
);

export const transformToArray = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.preprocess(
    (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return val.split(',').map(s => s.trim());
        }
      }
      return [];
    },
    z.array(itemSchema)
  );

export const createApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.unknown()).optional(),
    }).optional(),
    meta: z.object({
      timestamp: z.string().datetime(),
      requestId: z.string().uuid(),
      version: z.string(),
    }).optional(),
  });

export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  });

export const validationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string(),
  value: z.unknown().optional(),
});

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  statusCode: z.number().int().min(400).max(599),
  validationErrors: z.array(validationErrorSchema).optional(),
  timestamp: z.string().datetime(),
  path: z.string(),
  requestId: z.string().uuid(),
});

export type PaginationParams = z.infer<typeof paginationSchema>;
export type SortOption = z.infer<typeof sortSchema>;
export type FilterCondition = z.infer<typeof filterSchema>;
export type QueryOptions = z.infer<typeof queryOptionsSchema>;
export type ValidationError = z.infer<typeof validationErrorSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
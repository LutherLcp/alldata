/**
 * 数据血缘 (Data Lineage) 与 数据安全/GDPR Schema 规约
 */
import { z } from 'zod';

export const lineageNodeTypeSchema = z.enum(['sdk', 'raw_table', 'materialized_view', 'data_mart', 'dashboard_report']);

export const dataLineageNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: lineageNodeTypeSchema,
  status: z.enum(['healthy', 'warning', 'error']).default('healthy'),
  record_count: z.number().optional(),
});

export type DataLineageNode = z.infer<typeof dataLineageNodeSchema>;

export const dataLineageEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
});

export type DataLineageEdge = z.infer<typeof dataLineageEdgeSchema>;

export const dataMaskingRuleSchema = z.object({
  id: z.number().int().optional(),
  field_name: z.string(),
  mask_type: z.enum(['phone', 'email', 'id_card', 'name', 'hash']),
  roles_exempt: z.array(z.string()).default(['admin']),
});

export type DataMaskingRule = z.infer<typeof dataMaskingRuleSchema>;

export const gdprForgetQuerySchema = z.object({
  distinct_id: z.string().min(1),
  user_id: z.string().optional(),
  reason: z.string().optional(),
});

export type GDPRForgetQuery = z.infer<typeof gdprForgetQuerySchema>;

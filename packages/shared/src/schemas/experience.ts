/**
 * @alldata/shared — AI Copilot & Session Replay Zod Schema
 */
import { z } from 'zod';

export const copilotQuerySchema = z.object({
  prompt: z.string().min(1).max(1000),
  project_id: z.coerce.number().int().positive(),
});

export const sessionReplayQuerySchema = z.object({
  session_id: z.string().min(1),
  project_id: z.coerce.number().int().positive(),
});

export const heatmapQuerySchema = z.object({
  page_url: z.string().min(1),
  device: z.enum(['desktop', 'mobile', 'tablet']).default('desktop'),
  project_id: z.coerce.number().int().positive(),
});

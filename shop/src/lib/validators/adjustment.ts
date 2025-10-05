import { z } from 'zod';

export const AdjustmentLineSchema = z.object({
  sku: z.string().min(1),
  quantity: z.number().int(), // can be positive or negative
  reason: z.string().min(1),
  note: z.string().optional()
});

export const AdjustmentCreateSchema = z.object({
  lines: z.array(AdjustmentLineSchema).min(1),
  note: z.string().optional()
});

export type AdjustmentLineInput = z.infer<typeof AdjustmentLineSchema>;
export type AdjustmentCreateInput = z.infer<typeof AdjustmentCreateSchema>;



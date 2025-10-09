import { z } from 'zod';

export const TransferCreateSchema = z.object({
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  lines: z.array(z.object({ sku: z.string(), variantId: z.string().optional(), qty: z.number().int().positive() })).min(1),
  notes: z.string().optional()
}).refine((v) => v.fromLocationId !== v.toLocationId, { message: 'Locations must differ' });

export const TransferApproveSchema = z.object({});
export const TransferPickSchema = z.object({
  picks: z.array(z.object({ sku: z.string(), variantId: z.string().optional(), qty: z.number().int().positive() })).min(1)
});
export const TransferDispatchSchema = z.object({});
export const TransferReceiveSchema = z.object({
  receipts: z.array(z.object({ sku: z.string(), variantId: z.string().optional(), qty: z.number().int().positive() })).min(1)
});
export const TransferCancelSchema = z.object({ reason: z.string().optional() });

export type TransferCreateInput = z.infer<typeof TransferCreateSchema>;

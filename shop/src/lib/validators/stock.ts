import { z } from 'zod';

export const StockAdjustSchema = z.object({
  locationId: z.string().min(1),
  lines: z.array(z.object({ sku: z.string(), variantId: z.string().optional(), delta: z.number().int(), reason: z.string().optional() })).min(1)
});

export const StockReserveSchema = z.object({
  locationId: z.string().min(1),
  orderId: z.string().min(1),
  items: z.array(z.object({ sku: z.string(), variantId: z.string().optional(), qty: z.number().int().positive() })).min(1)
});

export const StockReleaseSchema = z.object({
  locationId: z.string().min(1),
  orderId: z.string().min(1).optional(),
  items: z.array(z.object({ sku: z.string(), variantId: z.string().optional(), qty: z.number().int().positive() })).optional()
}).refine((v) => !!v.orderId || (Array.isArray(v.items) && v.items.length > 0), { message: 'orderId or items required' });

export type StockAdjustInput = z.infer<typeof StockAdjustSchema>;
export type StockReserveInput = z.infer<typeof StockReserveSchema>;
export type StockReleaseInput = z.infer<typeof StockReleaseSchema>;

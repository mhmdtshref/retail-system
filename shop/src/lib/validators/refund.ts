import { z } from 'zod';

export const RefundCreateSchema = z.object({
  origin: z.object({ type: z.enum(['return','exchange','sale_adjustment','manual']), refId: z.string().optional() }),
  customerId: z.string().optional(),
  method: z.enum(['cash','card','transfer','store_credit']),
  amount: z.number().nonnegative(),
  notes: z.string().optional(),
  externalRef: z.string().optional()
});

export const RefundListQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  method: z.enum(['cash','card','transfer','store_credit']).optional(),
  status: z.enum(['pending','confirmed','failed']).optional(),
  customerId: z.string().optional()
});



import { z } from 'zod';

export const LayawayCreateSchema = z.object({
  saleId: z.string().min(1),
  customerId: z.string().min(1),
  upfrontPaid: z.number().nonnegative(),
  notes: z.string().optional()
});

export const LayawayListQuery = z.object({
  status: z.enum(['active','overdue','completed','canceled','forfeited']).optional(),
  bucket: z.enum(['UPCOMING_7','PD_0_7','PD_8_14','PD_15_30','PD_GT_30']).optional(),
  q: z.string().optional(),
  customerId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  cashier: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
  cursor: z.string().optional()
});

export const LayawayPaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['cash','card','transfer','store_credit']),
  seq: z.number().int().nonnegative().optional()
});

export const LayawayCancelSchema = z.object({ reason: z.string().optional() });
export const LayawayForfeitSchema = z.object({ reason: z.string().optional() });

export const LayawayRemindSchema = z.object({
  channels: z.array(z.enum(['email','sms','webhook'])).min(1),
  preview: z.boolean().optional()
});


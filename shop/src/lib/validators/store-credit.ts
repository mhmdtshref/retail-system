import { z } from 'zod';

export const StoreCreditIssueSchema = z.object({
  customerId: z.string().min(1),
  amount: z.number().positive(),
  expiresAt: z.string().optional(),
  note: z.string().optional(),
  origin: z.object({ type: z.enum(['return','exchange','manual']), refId: z.string().optional() })
});

export const StoreCreditRedeemSchema = z.object({
  creditIdOrCode: z.string().min(1).optional(),
  creditId: z.string().optional(), // alias
  code: z.string().optional(), // alias
  customerId: z.string().min(1),
  amount: z.number().positive(),
  saleId: z.string().optional()
});



import { z } from 'zod';

export const TaxRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  rate: z.number().min(0),
  scope: z.object({ categories: z.array(z.string()).optional(), brands: z.array(z.string()).optional(), skus: z.array(z.string()).optional() }).optional(),
  zeroRated: z.boolean().optional(),
  exempt: z.boolean().optional(),
  active: z.boolean(),
});

export const TaxConfigSchema = z.object({
  priceMode: z.enum(['tax_inclusive','tax_exclusive']),
  defaultRate: z.number().min(0).default(0),
  rules: z.array(TaxRuleSchema).default([]),
  precision: z.number().int().min(0).max(4).default(2),
  roundingStrategy: z.enum(['half_up','bankers']).default('half_up'),
  receiptRounding: z.enum(['none','half_up','bankers']).default('none').optional(),
  cashRounding: z.object({ enabled: z.boolean(), increment: z.union([z.literal(0.05), z.literal(0.1)]) }).optional()
});

export type TaxConfig = z.infer<typeof TaxConfigSchema>;

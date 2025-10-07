import { z } from 'zod';

export const CurrencyConfigSchema = z.object({
  defaultCurrency: z.string().min(3),
  displayLocale: z.string().min(2),
  allowFxNote: z.boolean().optional(),
});

export type CurrencyConfig = z.infer<typeof CurrencyConfigSchema>;

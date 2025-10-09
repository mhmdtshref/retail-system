import { z } from 'zod';

export const LocationCreateSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1),
  name_ar: z.string().optional(),
  type: z.enum(['store','warehouse','returns']).default('store'),
  isSellable: z.boolean().default(false),
  isStorageOnly: z.boolean().optional(),
  address: z.object({ line1: z.string().optional(), city: z.string().optional(), country: z.string().optional(), phone: z.string().optional(), postal: z.string().optional() }).optional(),
  tz: z.string().optional()
});

export const LocationUpdateSchema = LocationCreateSchema.partial();

export type LocationCreateInput = z.infer<typeof LocationCreateSchema>;
export type LocationUpdateInput = z.infer<typeof LocationUpdateSchema>;

import { z } from 'zod';

export const CountScopeSchema = z.object({
  type: z.enum(['all','filter','upload']),
  filter: z.object({ category: z.string().optional(), brand: z.string().optional() }).optional(),
  uploadFileUrl: z.string().url().optional()
});

export const CountSessionCreateSchema = z.object({
  name: z.string().min(1),
  scope: CountScopeSchema,
  location: z.string().optional()
});

export const CountItemPatchSchema = z.object({
  sku: z.string().min(1),
  counted: z.number().int().nonnegative().optional(),
  recount: z.boolean().optional(),
  note: z.string().optional()
});

export const CountSessionPatchSchema = z.object({
  items: z.array(CountItemPatchSchema).min(1),
  status: z.enum(['open','reviewing']).optional()
});



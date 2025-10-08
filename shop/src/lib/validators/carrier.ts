import { z } from 'zod';

export const CarrierAccountSchema = z.object({
  _id: z.string().optional(),
  type: z.enum(['aramex','smsa','dhl','fedex','webhook_generic']),
  name: z.string().min(2),
  enabled: z.boolean().default(false),
  credentials: z.record(z.string()).default({}),
  defaultService: z.string().optional(),
  pickup: z.object({ name: z.string().optional(), phone: z.string().optional(), address1: z.string().min(3), city: z.string().min(2), country: z.string().min(2), postal: z.string().optional() }),
  cod: z.object({ enabled: z.boolean().default(false), remitDays: z.number().optional() }).partial().optional(),
  routing: z.object({ countries: z.array(z.string()).optional(), cities: z.array(z.string()).optional(), weightMinKg: z.number().optional(), weightMaxKg: z.number().optional(), codOnly: z.boolean().optional(), nonCodOnly: z.boolean().optional(), priority: z.number().optional() }).partial().optional()
});


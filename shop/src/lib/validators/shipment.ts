import { z } from 'zod';

export const AddressSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  address1: z.string().min(3),
  city: z.string().min(2),
  country: z.string().min(2),
  postal: z.string().optional()
});

export const CreateShipmentSchema = z.object({
  orderId: z.string().min(1),
  to: AddressSchema,
  cod: z.object({ enabled: z.boolean(), amount: z.number().nonnegative(), currency: z.string().min(2) }).partial().optional(),
  weightKg: z.number().positive().optional(),
  pieces: z.number().int().positive().optional(),
  service: z.string().optional()
});

export const TrackSchema = z.object({ ids: z.array(z.string()).optional(), since: z.string().datetime().optional() });


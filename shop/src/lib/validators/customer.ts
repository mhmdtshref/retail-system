import { z } from 'zod';

const phoneSchema = z.object({
  e164: z.string().regex(/^\+\d{7,15}$/),
  raw: z.string().optional(),
  primary: z.boolean().optional()
});

const addressSchema = z.object({
  label: z.string().max(40).optional(),
  name_ar: z.string().max(80).optional(),
  name_en: z.string().max(80).optional(),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  postal: z.string().max(20).optional(),
  country: z.string().max(2).optional(),
  phone: z.string().optional(),
  isDefault: z.boolean().optional()
});

export const CustomerCreateSchema = z.object({
  firstName_ar: z.string().max(80).optional(),
  lastName_ar: z.string().max(80).optional(),
  fullName_ar: z.string().max(160).optional(),
  firstName_en: z.string().max(80).optional(),
  lastName_en: z.string().max(80).optional(),
  fullName_en: z.string().max(160).optional(),
  phones: z.array(phoneSchema).min(0).max(5).default([]),
  email: z.string().email().optional(),
  gender: z.enum(['male','female','other']).optional(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tags: z.array(z.string().max(30)).optional(),
  notes: z.string().max(2000).optional(),
  addresses: z.array(addressSchema).optional(),
  consent: z.object({ marketing: z.boolean().optional(), sms: z.boolean().optional(), email: z.boolean().optional() }).optional(),
  status: z.enum(['active','archived']).optional()
});

export const CustomerUpdateSchema = CustomerCreateSchema.partial();

export type CustomerCreateInput = z.infer<typeof CustomerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof CustomerUpdateSchema>;


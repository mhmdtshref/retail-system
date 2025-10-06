import { z } from 'zod';

export const CouponTypeSchema = z.enum(['percent','amount']);

const ScopeSchema = z.object({
  include: z.object({
    categories: z.array(z.string()).optional(),
    brands: z.array(z.string()).optional(),
    skus: z.array(z.string()).optional()
  }).partial().optional(),
  exclude: z.object({
    categories: z.array(z.string()).optional(),
    brands: z.array(z.string()).optional(),
    skus: z.array(z.string()).optional()
  }).partial().optional(),
  channel: z.array(z.enum(['retail','online'])).optional(),
  customerGroups: z.array(z.string()).optional()
}).partial().optional();

const ConstraintsSchema = z.object({
  minSubtotal: z.number().nonnegative().optional(),
  perCustomerLimit: z.number().int().nonnegative().optional(),
  perCodeLimit: z.number().int().nonnegative().optional(),
  globalLimit: z.number().int().nonnegative().optional(),
  maxDiscount: z.number().nonnegative().optional(),
  stackable: z.boolean().optional()
}).partial().optional();

export const CouponSchema = z.object({
  code: z.string().min(3),
  name: z.string().optional(),
  type: CouponTypeSchema,
  value: z.number().nonnegative(),
  scope: ScopeSchema,
  constraints: ConstraintsSchema,
  expiresAt: z.string().optional(),
  active: z.boolean().optional()
});

export const CouponBatchSchema = z.object({
  prefix: z.string().min(1),
  count: z.number().int().positive().max(10000),
  type: CouponTypeSchema,
  value: z.number().nonnegative(),
  constraints: ConstraintsSchema,
  scope: ScopeSchema,
  expiresAt: z.string().optional()
});

export type CouponInput = z.infer<typeof CouponSchema>;
export type CouponBatchInput = z.infer<typeof CouponBatchSchema>;

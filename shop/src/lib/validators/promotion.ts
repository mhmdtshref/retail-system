import { z } from 'zod';

export const PromoTypeSchema = z.enum(['percent','amount','bogo','threshold']);
export const PromoLevelSchema = z.enum(['order','line']);
export const PromoStackingSchema = z.enum(['inherit','none','order_only','line_only','allow']);

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
  maxDiscount: z.number().nonnegative().optional(),
  perOrderLimit: z.number().int().nonnegative().optional(),
  perCustomerLimit: z.number().int().nonnegative().optional(),
  globalLimit: z.number().int().nonnegative().optional(),
  firstPurchaseOnly: z.boolean().optional()
}).partial().optional();

const ScheduleSchema = z.object({
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional()
}).partial().optional();

export const PromotionSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).optional(),
  type: PromoTypeSchema,
  level: PromoLevelSchema,
  value: z.number().nonnegative().optional(),
  x: z.number().int().positive().optional(),
  y: z.number().int().positive().optional(),
  yDiscount: z.number().nonnegative().max(100).optional(),
  scope: ScopeSchema,
  constraints: ConstraintsSchema,
  schedule: ScheduleSchema,
  stacking: PromoStackingSchema.optional(),
  priority: z.number().int(),
  active: z.boolean().optional()
});

export type PromotionInput = z.infer<typeof PromotionSchema>;

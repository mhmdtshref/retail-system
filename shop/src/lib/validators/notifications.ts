import { z } from 'zod';

export const ChannelEnum = z.enum(['email','sms','whatsapp']);
export const EventEnum = z.enum([
  'ORDER_CREATED','ORDER_PAID','SHIPMENT_CREATED','OUT_FOR_DELIVERY','DELIVERED','COD_REMINDER',
  'LAYAWAY_CREATED','LAYAWAY_PAYMENT_POSTED','LAYAWAY_DUE_SOON','LAYAWAY_OVERDUE','LAYAWAY_FORFEITED'
]);

export const NotificationSettingsSchema = z.object({
  channels: z.object({ email: z.boolean(), sms: z.boolean(), whatsapp: z.boolean() }),
  email: z.object({ fromName: z.string().optional(), fromAddress: z.string().email().optional(), relayWebhookUrl: z.string().url().optional() }).optional(),
  sms: z.object({ senderId: z.string().optional(), relayWebhookUrl: z.string().url().optional() }).optional(),
  whatsapp: z.object({ waNumber: z.string().optional(), relayWebhookUrl: z.string().url().optional() }).optional(),
  throttling: z.object({ hoursPerEvent: z.number().int().positive().max(168).default(24) }).optional(),
  autoSend: z.record(EventEnum, z.boolean()).partial().optional(),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional()
});

export const TemplateSchema = z.object({
  key: EventEnum,
  channel: ChannelEnum,
  lang: z.enum(['ar','en']),
  name: z.string().min(1),
  subject: z.string().optional(),
  body: z.string().min(1),
  variables: z.array(z.string()).default([]),
  version: z.number().int().positive().default(1)
});

export const TemplateUpdateSchema = TemplateSchema.partial().extend({ _id: z.string().optional() });

export const TemplatesQuerySchema = z.object({
  key: EventEnum.optional(),
  channel: ChannelEnum.optional(),
  lang: z.enum(['ar','en']).optional()
});

export const SendTestSchema = z.object({
  channel: ChannelEnum,
  to: z.object({ email: z.string().email().optional(), phone: z.string().optional(), wa: z.string().optional() }),
  key: EventEnum,
  lang: z.enum(['ar','en']).default('ar'),
  sampleData: z.record(z.string(), z.any()).optional()
});

export const SendIntentSchema = z.object({
  event: EventEnum,
  entity: z.object({ type: z.enum(['order','layaway']), id: z.string() }),
  customerId: z.string(),
  channels: z.array(ChannelEnum).optional()
});

export type NotificationSettingsInput = z.infer<typeof NotificationSettingsSchema>;
export type TemplateInput = z.infer<typeof TemplateSchema>;
export type TemplateUpdateInput = z.infer<typeof TemplateUpdateSchema>;
export type SendTestInput = z.infer<typeof SendTestSchema>;
export type SendIntentInput = z.infer<typeof SendIntentSchema>;

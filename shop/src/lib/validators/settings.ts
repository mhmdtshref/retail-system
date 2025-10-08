import { z } from 'zod';

export const PaymentRulesSchema = z.object({
  enabledMethods: z.array(z.enum(['cash','card','transfer','store_credit','cod','partial'])).default(['cash','card','transfer','store_credit']),
  partial: z.object({
    enabled: z.boolean().default(false),
    minUpfrontPct: z.number().min(0).max(100).default(10),
    maxDays: z.number().min(1).max(365).default(30),
    autoCancel: z.boolean().default(false),
    forfeitDays: z.number().min(0).max(365).default(30).optional(),
    graceDays: z.number().min(0).max(30).default(0).optional()
  }).optional(),
  cashierManualDiscountLimitPct: z.number().min(0).max(100).default(10),
  drawer: z.object({
    openOnCashSale: z.boolean().default(true),
    openOnRefund: z.boolean().default(true),
    allowNoSale: z.boolean().default(false),
    requireEndShiftCount: z.boolean().default(true)
  }),
  cash: z.object({
    allowChange: z.boolean().default(true),
    roundingIncrement: z.union([z.literal(0.05), z.literal(0.1)]).nullable().optional()
  }),
  card: z.object({
    requireLast4: z.boolean().optional(),
    requireRef: z.boolean().optional()
  }).optional(),
  transfer: z.object({
    requireRef: z.boolean().optional()
  }).optional()
});

export const LocalesConfigSchema = z.object({
  defaultLang: z.enum(['ar','en']).default('ar'),
  rtlByLang: z.object({ ar: z.boolean().default(true), en: z.boolean().default(false) }),
  currency: z.string().min(2).max(4).default('SAR'),
  displayLocale: z.string().default('ar-SA'),
  dateFormat: z.string().default('dd/MM/yyyy'),
  timeFormat: z.enum(['12h','24h']).default('12h'),
  shopInfo: z.object({
    name_ar: z.string().default(''),
    name_en: z.string().optional(),
    phone: z.string().optional(),
    taxNumber: z.string().optional(),
    address_ar: z.string().optional(),
    address_en: z.string().optional()
  })
});

export const ReceiptTemplateSchema = z.object({
  showLogo: z.boolean().default(true),
  showReceiptBarcode: z.boolean().default(true),
  showTaxSummary: z.boolean().default(true),
  showCashier: z.boolean().default(true),
  showCustomer: z.boolean().default(true),
  showReturnPolicy: z.boolean().default(false),
  showStoreCredit: z.boolean().default(true),
  labels: z.record(z.string(), z.string()).default({}),
  header: z.object({ ar: z.string().optional(), en: z.string().optional() }).default({}),
  footer: z.object({ ar: z.string().optional(), en: z.string().optional() }).default({})
});

export const ReceiptsConfigSchema = z.object({
  thermal80: ReceiptTemplateSchema,
  a4: ReceiptTemplateSchema
});

export const SettingsDocSchema = z.object({
  _id: z.literal('global'),
  version: z.number(),
  payments: PaymentRulesSchema,
  locales: LocalesConfigSchema,
  receipts: ReceiptsConfigSchema,
  notifications: z.object({
    email: z.object({ fromName: z.string().optional(), fromAddress: z.string().email().optional(), relayWebhookUrl: z.string().url().optional() }).optional(),
    sms: z.object({ relayWebhookUrl: z.string().url().optional() }).optional(),
    webhook: z.object({ url: z.string().url().optional(), secret: z.string().optional() }).optional()
  }).optional(),
  updatedAt: z.string(),
  updatedBy: z.string()
});


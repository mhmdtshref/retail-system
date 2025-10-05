import { z } from 'zod';

export const LabelItemSchema = z.object({
  sku: z.string().min(1),
  barcode: z.string().regex(/^[0-9]{12,13}$/).optional(),
  name_ar: z.string().min(1),
  size: z.string().optional(),
  color: z.string().optional(),
  price: z.number().optional(),
  brand: z.string().optional(),
  qty: z.number().int().positive(),
});

export type LabelItem = z.infer<typeof LabelItemSchema>;

export const LabelShowOptionsSchema = z.object({
  name: z.boolean().default(true),
  sku: z.boolean().default(true),
  sizeColor: z.boolean().default(true),
  price: z.boolean().default(true),
  brand: z.boolean().optional().default(false),
});

export const LabelShopOptionsSchema = z.object({
  name: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

export const LabelOptionsSchema = z.object({
  barcodeType: z.enum(['auto','code128','ean13','qr']).optional().default('auto'),
  show: LabelShowOptionsSchema.default({ name: true, sku: true, sizeColor: true, price: true }),
  shop: LabelShopOptionsSchema.optional(),
});

export const LabelTemplateSchema = z.enum(['thermal-80','thermal-58','a4-3x8']);

export const LabelsPreviewBodySchema = z.object({
  template: LabelTemplateSchema,
  items: z.array(LabelItemSchema).min(1),
  options: LabelOptionsSchema.default({})
});

export const LabelsZplBodySchema = z.object({
  items: z.array(LabelItemSchema).min(1),
  options: LabelOptionsSchema.default({})
});

export type LabelOptions = z.infer<typeof LabelOptionsSchema>;
export type LabelsPreviewBody = z.infer<typeof LabelsPreviewBodySchema>;
export type LabelsZplBody = z.infer<typeof LabelsZplBodySchema>;

import { z } from 'zod';

export const VariantSchema = z.object({
  sku: z.string().min(1),
  size: z.string().optional(),
  color: z.string().optional(),
  barcode: z.string().optional(),
  costPrice: z.number().nonnegative().optional(),
  retailPrice: z.number().nonnegative().optional()
});

export const ProductSchema = z.object({
  productCode: z.string().min(1),
  name_ar: z.string().min(1),
  name_en: z.string().min(1),
  category: z.string().optional(),
  brand: z.string().optional(),
  basePrice: z.number().nonnegative().optional(),
  status: z.enum(['active', 'archived']).default('active'),
  images: z.array(z.string().url()).optional(),
  variants: z.array(VariantSchema).min(1)
});

export const ProductUpdateSchema = ProductSchema.partial().extend({
  variants: z.array(VariantSchema).optional(),
  status: z.enum(['active', 'archived']).optional()
});

export type VariantInput = z.infer<typeof VariantSchema>;
export type ProductInput = z.infer<typeof ProductSchema>;
export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;



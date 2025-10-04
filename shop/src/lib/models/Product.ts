import { Schema, model, models } from 'mongoose';

const VariantSchema = new Schema({
  sku: { type: String, required: true, unique: true, index: true, trim: true },
  size: { type: String },
  color: { type: String },
  barcode: { type: String, index: true },
  costPrice: { type: Number },
  retailPrice: { type: Number },
}, { _id: false });

const ProductSchema = new Schema({
  productCode: { type: String, required: true, unique: true, index: true, trim: true },
  name_ar: { type: String },
  name_en: { type: String },
  category: { type: String },
  brand: { type: String },
  basePrice: { type: Number },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  images: [{ type: String }],
  variants: [VariantSchema]
}, { timestamps: true });

// Optional compound index for efficient lookups by size/color within a product
ProductSchema.index({ 'variants.size': 1, 'variants.color': 1, productCode: 1 });

export type VariantDoc = {
  sku: string;
  size?: string;
  color?: string;
  barcode?: string;
  costPrice?: number;
  retailPrice?: number;
};

export type ProductDoc = {
  productCode: string;
  name_ar?: string;
  name_en?: string;
  category?: string;
  brand?: string;
  basePrice?: number;
  status: 'active' | 'archived';
  images?: string[];
  variants: VariantDoc[];
};

export const Product = models.Product || model('Product', ProductSchema);


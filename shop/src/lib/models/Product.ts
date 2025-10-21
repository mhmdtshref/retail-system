import mongoose, { Schema, model } from 'mongoose';

const VariantSchema = new Schema({
  sku: { type: String, required: true, index: true, trim: true },
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

// Indexes aligning with migration (safety on app-start)
ProductSchema.index({ 'variants.size': 1, 'variants.color': 1, productCode: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ updatedAt: -1 });

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

export const Product = (mongoose.models as any).Product || model('Product', ProductSchema);


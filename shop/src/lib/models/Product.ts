import { Schema, model, models } from 'mongoose';

const ProductSchema = new Schema({
  sku: { type: String, required: true, unique: true, index: true },
  productCode: { type: String, required: true, unique: true, index: true },
  name_ar: String,
  name_en: String,
  size: String,
  color: String,
  retailPrice: { type: Number, required: true },
  barcode: { type: String, index: true },
  version: { type: Number, default: 1 },
}, { timestamps: true });

export type ProductDoc = {
  sku: string; productCode: string; name_ar?: string; name_en?: string; size?: string; color?: string; retailPrice: number; barcode?: string; version?: number;
}

export const Product = models.Product || model('Product', ProductSchema);


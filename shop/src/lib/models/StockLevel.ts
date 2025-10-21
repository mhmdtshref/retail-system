import mongoose, { Schema, model } from 'mongoose';

const StockLevelSchema = new Schema({
  sku: { type: String, required: true, index: true },
  variantId: { type: String },
  locationId: { type: String, required: true, index: true },
  onHand: { type: Number, required: true, default: 0 },
  reserved: { type: Number, required: true, default: 0 },
}, { timestamps: { createdAt: false, updatedAt: true } });

StockLevelSchema.index({ locationId: 1, sku: 1, variantId: 1 }, { unique: true });
StockLevelSchema.index({ sku: 1 });
StockLevelSchema.index({ locationId: 1 });

export const StockLevel = (mongoose.models as any).StockLevel || model('StockLevel', StockLevelSchema);

export type StockLevelDoc = {
  _id: string;
  sku: string;
  variantId?: string;
  locationId: string;
  onHand: number;
  reserved: number;
  updatedAt: string;
};

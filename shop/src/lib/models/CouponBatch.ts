import mongoose, { Schema, model } from 'mongoose';

const CouponBatchSchema = new Schema({
  prefix: { type: String, required: true, trim: true },
  count: { type: Number, required: true },
  type: { type: String, enum: ['percent','amount'], required: true },
  value: { type: Number, required: true },
  constraints: {
    minSubtotal: { type: Number },
    perCustomerLimit: { type: Number },
    perCodeLimit: { type: Number },
    globalLimit: { type: Number },
    maxDiscount: { type: Number },
    stackable: { type: Boolean, default: false },
  },
  scope: {
    include: { categories: [String], brands: [String], skus: [String] },
    exclude: { categories: [String], brands: [String], skus: [String] },
    channel: { type: [String], enum: ['retail','online'] },
    customerGroups: { type: [String] },
  },
  expiresAt: { type: String },
  generated: { type: Boolean, default: false },
}, { timestamps: true });

export const CouponBatch = (mongoose.models as any).CouponBatch || model('CouponBatch', CouponBatchSchema);

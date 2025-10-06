import { Schema, model, models, Types } from 'mongoose';

const CouponSchema = new Schema({
  code: { type: String, required: true, unique: true, index: true, trim: true },
  batchId: { type: Types.ObjectId, ref: 'CouponBatch', index: true },
  name: { type: String },
  type: { type: String, enum: ['percent','amount'], required: true },
  value: { type: Number, required: true },
  scope: {
    include: { categories: [String], brands: [String], skus: [String] },
    exclude: { categories: [String], brands: [String], skus: [String] },
    channel: { type: [String], enum: ['retail','online'] },
    customerGroups: { type: [String] },
  },
  constraints: {
    minSubtotal: { type: Number },
    perCustomerLimit: { type: Number },
    perCodeLimit: { type: Number },
    globalLimit: { type: Number },
    maxDiscount: { type: Number },
    stackable: { type: Boolean, default: false },
  },
  expiresAt: { type: String },
  usage: {
    globalUsed: { type: Number, default: 0 },
  },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true });

export const Coupon = models.Coupon || model('Coupon', CouponSchema);

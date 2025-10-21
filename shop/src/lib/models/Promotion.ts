import mongoose, { Schema, model } from 'mongoose';

export type PromoType = 'percent'|'amount'|'bogo'|'threshold';
export type PromoLevel = 'order'|'line';
export type PromoStacking = 'inherit'|'none'|'order_only'|'line_only'|'allow';

const ScopeSchema = new Schema({
  include: {
    categories: { type: [String], default: undefined },
    brands: { type: [String], default: undefined },
    skus: { type: [String], default: undefined },
  },
  exclude: {
    categories: { type: [String], default: undefined },
    brands: { type: [String], default: undefined },
    skus: { type: [String], default: undefined },
  },
  channel: { type: [String], enum: ['retail','online'], default: undefined },
  customerGroups: { type: [String], default: undefined },
}, { _id: false });

const ConstraintsSchema = new Schema({
  minSubtotal: { type: Number },
  maxDiscount: { type: Number },
  perOrderLimit: { type: Number },
  perCustomerLimit: { type: Number },
  globalLimit: { type: Number },
  firstPurchaseOnly: { type: Boolean },
}, { _id: false });

const ScheduleSchema = new Schema({
  startsAt: { type: String },
  endsAt: { type: String },
  daysOfWeek: { type: [Number], default: undefined },
  startTime: { type: String },
  endTime: { type: String },
}, { _id: false });

const PromotionSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, index: true, sparse: true, trim: true },
  type: { type: String, enum: ['percent','amount','bogo','threshold'], required: true },
  level: { type: String, enum: ['order','line'], required: true },
  value: { type: Number },
  x: { type: Number },
  y: { type: Number },
  yDiscount: { type: Number },
  scope: { type: ScopeSchema },
  constraints: { type: ConstraintsSchema },
  schedule: { type: ScheduleSchema },
  stacking: { type: String, enum: ['inherit','none','order_only','line_only','allow'], default: 'inherit' },
  priority: { type: Number, default: 100, index: true },
  active: { type: Boolean, default: true, index: true },
  usage: { globalUsed: { type: Number, default: 0 } },
  createdBy: { type: String },
}, { timestamps: true });

PromotionSchema.index({ active: 1, priority: 1 });
PromotionSchema.index({ code: 1 }, { unique: false });

export const Promotion = (mongoose.models as any).Promotion || model('Promotion', PromotionSchema);

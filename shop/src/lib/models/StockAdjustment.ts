import { Schema, model, models, Types } from 'mongoose';

const AdjustmentLineSchema = new Schema({
  sku: { type: String, required: true, index: true },
  quantity: { type: Number, required: true },
  reason: { type: String, required: true },
  note: { type: String },
}, { _id: false });

const StockAdjustmentSchema = new Schema({
  lines: { type: [AdjustmentLineSchema], required: true },
  note: { type: String },
  postedAt: { type: Date, default: Date.now },
  createdBy: { type: String },
  refMovementIds: { type: [Types.ObjectId], default: [] },
}, { timestamps: true });

export const StockAdjustment = models.StockAdjustment || model('StockAdjustment', StockAdjustmentSchema);



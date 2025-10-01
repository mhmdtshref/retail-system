import { Schema, model, models, Types } from 'mongoose';

const StockMovementSchema = new Schema({
  sku: { type: String, required: true, index: true },
  type: { type: String, enum: ['purchase_in','sale_out','adjustment','return_in','return_out','reservation_hold','reservation_release','PURCHASE','SALE','RETURN','ADJUST','RESERVE','RELEASE'], required: true },
  quantity: { type: Number, required: true }, // positive for in, negative for out
  refId: { type: Types.ObjectId, index: true },
  occurredAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

StockMovementSchema.index({ sku: 1, occurredAt: -1 });

export const StockMovement = models.StockMovement || model('StockMovement', StockMovementSchema);


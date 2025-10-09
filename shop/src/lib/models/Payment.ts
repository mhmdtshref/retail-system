import { Schema, model, models, Types } from 'mongoose';

const PaymentSchema = new Schema({
  saleId: { type: Types.ObjectId, ref: 'Sale', index: true },
  method: { type: String, enum: ['cash', 'card', 'transfer', 'cod_remit'], required: true },
  amount: { type: Number, required: true },
  seq: { type: Number, required: true },
  receivedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Align with migration
PaymentSchema.index({ saleId: 1, createdAt: -1 });
PaymentSchema.index({ method: 1, createdAt: -1 });

export const Payment = models.Payment || model('Payment', PaymentSchema);


import { Schema, model, models, Types } from 'mongoose';

const PaymentSchema = new Schema({
  saleId: { type: Types.ObjectId, ref: 'Sale', index: true },
  method: { type: String, enum: ['cash', 'card', 'partial'], required: true },
  amount: { type: Number, required: true },
  seq: { type: Number, required: true },
}, { timestamps: true });

export const Payment = models.Payment || model('Payment', PaymentSchema);


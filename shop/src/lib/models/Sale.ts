import { Schema, model, models, Types } from 'mongoose';

const SaleSchema = new Schema({
  lines: [{ sku: String, qty: Number, price: Number }],
  customerId: { type: Types.ObjectId, ref: 'Customer' },
  total: Number,
  paid: { type: Number, default: 0 },
  status: { type: String, enum: ['OPEN', 'PAID', 'PARTIAL'], default: 'OPEN' },
}, { timestamps: true });

export const Sale = models.Sale || model('Sale', SaleSchema);


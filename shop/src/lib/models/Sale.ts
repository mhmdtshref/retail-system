import { Schema, model, models, Types } from 'mongoose';

const InstallmentSchema = new Schema({
  seq: { type: Number, required: true },
  dueDate: { type: String, required: true }, // ISO string
  amount: { type: Number, required: true },
  paidAt: { type: String }, // ISO string
}, { _id: false });

const ReservationSchema = new Schema({
  sku: { type: String, required: true },
  qty: { type: Number, required: true },
  heldAt: { type: String, required: true }, // ISO string
  expiresAt: { type: String }, // ISO string
}, { _id: false });

const PaymentPlanSchema = new Schema({
  mode: { type: String, enum: ['partial'], required: true },
  downPayment: { type: Number, required: true },
  remaining: { type: Number, required: true },
  minDownPercent: { type: Number, default: 10 },
  schedule: { type: [InstallmentSchema], default: [] },
  expiresAt: { type: String }, // ISO string
}, { _id: false });

const SaleSchema = new Schema({
  lines: [{ sku: String, qty: Number, price: Number }],
  customerId: { type: Types.ObjectId, ref: 'Customer' },
  channel: { type: String, enum: ['retail', 'online'], default: 'retail' },
  total: Number,
  paid: { type: Number, default: 0 },
  status: { type: String, enum: ['open','partially_paid','paid','cancelled'], default: 'open', index: true },
  paymentPlan: { type: PaymentPlanSchema },
  reservations: { type: [ReservationSchema], default: [] },
}, { timestamps: true });

export const Sale = models.Sale || model('Sale', SaleSchema);

